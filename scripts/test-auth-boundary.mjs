#!/usr/bin/env node
// Regression test for the guest/real-user auth boundary on POST /api/turso-token,
// formalizing the trace in specs/005-repo-hygiene-security-and-public-readiness/research.md
// item 4, plus the T022 rate-limit addition. Run against a local `vercel dev` (default,
// via `pnpm run dev:api` in another shell) or a real deployment via BASE_URL.
//
// Usage: node scripts/test-auth-boundary.mjs [--base-url <url>]
//   BASE_URL env var is also accepted; defaults to http://localhost:3111

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");

const argBaseUrl = (() => {
  const idx = process.argv.indexOf("--base-url");
  return idx !== -1 ? process.argv[idx + 1] : undefined;
})();
const BASE_URL = argBaseUrl ?? process.env.BASE_URL ?? "http://localhost:3111";
const ENDPOINT = `${BASE_URL.replace(/\/$/, "")}/api/turso-token`;

// Only needed when BASE_URL points at a Vercel Preview with Deployment Protection
// enabled (`vercel curl <url> --debug` prints/generates one) — irrelevant for local
// `vercel dev` or an unprotected deployment.
const argBypass = (() => {
  const idx = process.argv.indexOf("--protection-bypass");
  return idx !== -1 ? process.argv[idx + 1] : undefined;
})();
const PROTECTION_BYPASS = argBypass ?? process.env.VERCEL_PROTECTION_BYPASS;

// Best-effort: read expected database URLs from .env.local so the guest-scoping
// assertion can be exact rather than just "a url came back". Missing file/vars just
// weaken that one assertion to a shape check instead of failing the whole script.
const readEnvLocal = () => {
  try {
    const content = readFileSync(path.join(repoRoot, ".env.local"), "utf8");
    const vars = {};
    for (const line of content.split("\n")) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match) vars[match[1]] = match[2].replace(/^"(.*)"$/, "$1");
    }
    return vars;
  } catch {
    return {};
  }
};
const envLocal = readEnvLocal();

let failures = 0;
const results = [];

const record = (name, pass, detail) => {
  results.push({ name, pass, detail });
  if (!pass) failures += 1;
  console.log(`${pass ? "PASS" : "FAIL"} — ${name}${detail ? `: ${detail}` : ""}`);
};

const post = (headers) =>
  fetch(ENDPOINT, {
    method: "POST",
    headers: PROTECTION_BYPASS
      ? { ...headers, "x-vercel-protection-bypass": PROTECTION_BYPASS }
      : headers,
  });

const testForgedGuestBearer = async () => {
  const res = await post({ Authorization: "Bearer guest" });
  const body = await res.text();
  const bodyEmpty = body.length === 0;
  record(
    "Authorization: Bearer guest -> 401, no token/url/accountConfig",
    res.status === 401 && bodyEmpty,
    `status=${res.status} bodyLength=${body.length}`,
  );
};

const testGuestHeader = async () => {
  const res = await post({ "X-Guest-Request": "true" });
  if (res.status !== 200) {
    record("X-Guest-Request: true -> 200 with guest-scoped token", false, `status=${res.status}`);
    return;
  }
  const body = await res.json();
  const hasShape =
    typeof body.url === "string" &&
    typeof body.token === "string" &&
    typeof body.expiresAt === "string" &&
    typeof body.accountConfig === "object" &&
    body.accountConfig !== null;

  let scopedCorrectly = hasShape;
  let detail = `url=${body.url}`;
  if (envLocal.TURSO_GUEST_DATABASE_URL && envLocal.TURSO_DATABASE_URL) {
    scopedCorrectly =
      hasShape &&
      body.url === envLocal.TURSO_GUEST_DATABASE_URL &&
      body.url !== envLocal.TURSO_DATABASE_URL;
    detail = `url=${body.url} expectedGuestUrl=${envLocal.TURSO_GUEST_DATABASE_URL}`;
  }
  record("X-Guest-Request: true -> 200 with guest-scoped token", scopedCorrectly, detail);
};

const testForgedRealToken = async () => {
  const res = await post({ Authorization: "Bearer not.a.validjwt" });
  const body = await res.text();
  record(
    "Forged/malformed real-token Authorization -> 401, no partial credentials",
    res.status === 401 && body.length === 0,
    `status=${res.status} bodyLength=${body.length}`,
  );
};

const testNoCredentials = async () => {
  const res = await post({});
  record("No Authorization/guest header -> 401", res.status === 401, `status=${res.status}`);
};

const testRateLimit = async () => {
  // Threshold is 20 req / 60s per IP (api/turso-token.ts) — send a burst comfortably
  // past it on the guest branch (no Cognito call needed) and expect at least one 429
  // with a Retry-After header, without ever losing a 401/200 to something unexpected.
  // NOTE: local `vercel dev` reloads the function module per invocation, so the
  // module-scope counter never persists across requests there — this check only
  // exercises the real behavior against a deployed (Preview/Production) BASE_URL,
  // where Fluid Compute reuses warm instances (research.md item 3). Requests are sent
  // SEQUENTIALLY, not concurrently: a concurrent burst gets load-balanced across
  // multiple warm instances (each with its own independent counter), which never
  // trips the per-instance limit — verified empirically against a real Preview
  // deployment (30 concurrent requests -> 0 429s; 30 sequential -> 429s after #20).
  const BURST_SIZE = 30;
  const responses = [];
  for (let i = 0; i < BURST_SIZE; i += 1) {
    responses.push(await post({ "X-Guest-Request": "true" }));
  }
  const rateLimited = responses.filter((res) => res.status === 429);
  const retryAfterPresent = rateLimited.every((res) => res.headers.has("retry-after"));
  const unexpectedStatus = responses.filter((res) => res.status !== 200 && res.status !== 429);
  record(
    `Burst of ${BURST_SIZE} guest requests -> at least one 429 with Retry-After`,
    rateLimited.length > 0 && retryAfterPresent && unexpectedStatus.length === 0,
    `429s=${rateLimited.length}/${BURST_SIZE} unexpectedStatuses=${unexpectedStatus
      .map((res) => res.status)
      .join(",")}`,
  );
};

console.log(`Testing auth boundary against ${ENDPOINT}\n`);

await testForgedGuestBearer();
await testGuestHeader();
await testForgedRealToken();
await testNoCredentials();
await testRateLimit();

console.log(`\n${results.length - failures}/${results.length} checks passed.`);
if (failures > 0) process.exit(1);
