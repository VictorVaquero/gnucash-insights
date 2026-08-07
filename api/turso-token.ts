import type { VercelRequest, VercelResponse } from "@vercel/node";

import { verifyCognitoIdToken } from "./_lib/verifyCognitoToken";

const TOKEN_EXPIRATION = "1h";

const platformToken = process.env.TURSO_PLATFORM_TOKEN;
const orgSlug = process.env.TURSO_ORG_SLUG;
const prodDatabaseName = process.env.TURSO_DATABASE_NAME;
const prodDatabaseUrl = process.env.TURSO_DATABASE_URL;
const guestDatabaseName = process.env.TURSO_GUEST_DATABASE_NAME;
const guestDatabaseUrl = process.env.TURSO_GUEST_DATABASE_URL;

const mintReadOnlyToken = async (databaseName: string) => {
  const response = await fetch(
    `https://api.turso.tech/v1/organizations/${orgSlug}/databases/${databaseName}/auth/tokens?expiration=${TOKEN_EXPIRATION}&authorization=read-only`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${platformToken}` },
    }
  );
  if (!response.ok) {
    throw new Error(
      `Turso token mint failed for ${databaseName}: ${response.status}`
    );
  }
  const { jwt } = (await response.json()) as { jwt: string };
  return jwt;
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    res.status(405).end();
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
      // Real-user path: a Turso credential scoped to real financial data is only
      // ever issued after Cognito verification succeeds.
      await verifyCognitoIdToken(authHeader.slice("Bearer ".length));
      const token = await mintReadOnlyToken(prodDatabaseName);
      res.status(200).json({
        url: prodDatabaseUrl,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
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
      });
      return;
    }

    res.status(401).end();
  } catch (error) {
    console.error("turso-token: request rejected", error);
    res.status(401).end();
  }
}
