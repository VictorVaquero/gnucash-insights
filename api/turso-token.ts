import type { VercelRequest, VercelResponse } from "@vercel/node";

import { verifyCognitoIdToken } from "./_lib/verifyCognitoToken.js";

const TOKEN_EXPIRATION = "1h";

const platformToken = process.env.TURSO_PLATFORM_TOKEN;
const orgSlug = process.env.TURSO_ORG_SLUG;
const prodDatabaseName = process.env.TURSO_DATABASE_NAME;
const prodDatabaseUrl = process.env.TURSO_DATABASE_URL;
const guestDatabaseName = process.env.TURSO_GUEST_DATABASE_NAME;
const guestDatabaseUrl = process.env.TURSO_GUEST_DATABASE_URL;
// Real production data is scoped to members of this Cognito group, not to "any
// successfully authenticated Cognito user" — the pool may contain other accounts
// (e.g. a CI test user) that must fall back to guest-equivalent data, never real
// financials. Cognito includes `cognito:groups` in the ID token automatically for
// group members; no app-client attribute permissions needed.
const OWNER_GROUP = "owners";

export interface AccountConfig {
  expenses: string;
  income: string;
  checking: string;
  savings: string;
  assets: string;
  working: string;
  liability: string;
  investments: string;
  taxes: string;
  taxesAll: string[];
  tripDesc: string;
}

const ACCOUNT_CONFIG_REQUIRED_STRING_FIELDS = [
  "expenses",
  "income",
  "checking",
  "savings",
  "assets",
  "working",
  "liability",
  "investments",
  "taxes",
  "tripDesc",
] as const;

const isValidAccountConfig = (value: unknown): value is AccountConfig => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  const stringFieldsValid = ACCOUNT_CONFIG_REQUIRED_STRING_FIELDS.every(
    (field) => typeof candidate[field] === "string" && candidate[field] !== "",
  );
  const taxesAllValid =
    Array.isArray(candidate.taxesAll) &&
    candidate.taxesAll.every((item) => typeof item === "string");
  return stringFieldsValid && taxesAllValid;
};

// Synthetic demo values — not a secret, safe to keep in source.
// Must match the synthetic chart of accounts produced by
// scripts/generate-guest-data.mjs (default --seed) — re-run
// scripts/seed-guest-data.sh and copy its printed config here if the
// generator's account-generation logic ever changes.
const GUEST_ACCOUNT_CONFIG: AccountConfig = {
  expenses: "ce17d2f2bb362a53ae5c62d50baee397",
  income: "9e1be4b28d1f9e69595b47dbfe6841b5",
  checking: "681d053b91fcac8c821104aa8f0654d8",
  savings: "3ff48dea9c47c8a88ffc4aad6e5e658d",
  assets: "20bb44503f9f2284666a65e579893545",
  working: "2420479bcc3a877765428488a6202f1d",
  liability: "a32b51509376bec72d8de729c368f7dd",
  investments: "da104b4daee51a3744b8791cbe100533",
  taxes: "71c73988df20dc8143c7249bbf7debd5",
  taxesAll: ["30894ffbf3c148afcbcfcd9e58053b3a", "3c4023ff55eb3529ebcdbb3463f28d5e"],
  tripDesc: "Trip",
};

const getRealAccountConfig = (): AccountConfig | undefined => {
  const raw = process.env.ACCOUNT_CONFIG_VICTOR;
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (!isValidAccountConfig(parsed)) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
};

// Per-IP fixed-window rate limit. Module-scope state persists across warm invocations of
// the same function instance (Vercel Fluid Compute reuses instances — research.md item 3)
// but resets on cold start and isn't shared across instances/regions: a best-effort
// throttle against scripted abuse, not a hard guarantee. Threshold is generous relative to
// real usage — the client caches tokens for ~55 minutes (src/hooks/useDB.tsx), so a normal
// session sends at most one request per window.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;

const requestCounts = new Map<string, { count: number; resetAt: number }>();

const getClientIp = (req: VercelRequest): string => {
  const forwarded = req.headers["x-forwarded-for"];
  const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (forwardedIp) return forwardedIp.split(",")[0].trim();
  const realIp = req.headers["x-real-ip"];
  return (Array.isArray(realIp) ? realIp[0] : realIp) ?? "unknown";
};

const checkRateLimit = (ip: string): { limited: boolean; retryAfterSeconds: number } => {
  const now = Date.now();
  const entry = requestCounts.get(ip);
  if (!entry || now >= entry.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { limited: false, retryAfterSeconds: 0 };
  }
  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
    return {
      limited: true,
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    };
  }
  return { limited: false, retryAfterSeconds: 0 };
};

const mintReadOnlyToken = async (databaseName: string) => {
  const response = await fetch(
    `https://api.turso.tech/v1/organizations/${orgSlug}/databases/${databaseName}/auth/tokens?expiration=${TOKEN_EXPIRATION}&authorization=read-only`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${platformToken}` },
    },
  );
  if (!response.ok) {
    throw new Error(`Turso token mint failed for ${databaseName}: ${response.status}`);
  }
  const { jwt } = (await response.json()) as { jwt: string };
  return jwt;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }

  const rateLimit = checkRateLimit(getClientIp(req));
  if (rateLimit.limited) {
    res.setHeader("Retry-After", String(rateLimit.retryAfterSeconds));
    res.status(429).end();
    return;
  }

  if (
    !platformToken ||
    !orgSlug ||
    !prodDatabaseName ||
    !prodDatabaseUrl ||
    !guestDatabaseName ||
    !guestDatabaseUrl
  ) {
    console.error("turso-token: missing required Turso env vars");
    res.status(500).json({ error: "Server misconfigured" });
    return;
  }

  const isGuestRequest = req.headers["x-guest-request"] === "true";
  const authHeader = req.headers.authorization;

  try {
    if (authHeader?.startsWith("Bearer ")) {
      const payload = await verifyCognitoIdToken(authHeader.slice("Bearer ".length));
      const groups = Array.isArray(payload["cognito:groups"]) ? payload["cognito:groups"] : [];
      const isOwner = groups.includes(OWNER_GROUP);

      if (!isOwner) {
        // Authenticated but not in the owners group (e.g. the Playwright CI test
        // account): same guest-equivalent data as the unauthenticated guest path,
        // never real financials — only owners-group membership unlocks the real
        // database.
        const token = await mintReadOnlyToken(guestDatabaseName);
        res.status(200).json({
          url: guestDatabaseUrl,
          token,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          accountConfig: GUEST_ACCOUNT_CONFIG,
        });
        return;
      }

      // Owner path: a Turso credential scoped to real financial data is only ever
      // issued after Cognito verification succeeds AND the token carries owners-group
      // membership.
      const accountConfig = getRealAccountConfig();
      if (!accountConfig) {
        console.error("turso-token: missing or malformed ACCOUNT_CONFIG_VICTOR env var");
        res.status(500).json({ error: "Server misconfigured" });
        return;
      }
      const token = await mintReadOnlyToken(prodDatabaseName);
      res.status(200).json({
        url: prodDatabaseUrl,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        accountConfig,
      });
      return;
    }

    if (isGuestRequest) {
      // Guest path: no Cognito credential exists to verify (parity with today's
      // no-login guest access) — token is scoped to the guest database only, which
      // never contains real financial data, by construction.
      const token = await mintReadOnlyToken(guestDatabaseName);
      res.status(200).json({
        url: guestDatabaseUrl,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        accountConfig: GUEST_ACCOUNT_CONFIG,
      });
      return;
    }

    res.status(401).end();
  } catch (error) {
    console.error("turso-token: request rejected", error);
    res.status(401).end();
  }
}
