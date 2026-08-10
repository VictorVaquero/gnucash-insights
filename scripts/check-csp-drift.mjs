#!/usr/bin/env node
// Guards against silent CSP drift between this repo's own vercel.json and the
// CSP that `resumeweb` (a separate repo/Vercel project, owns victorvaquero.com,
// proxies /dashboard/* to this app) re-declares for that path. resumeweb is not
// reachable from this repo's CI (see research.md item 6), so this compares
// against a hardcoded snapshot committed alongside this script instead of a
// live fetch. That snapshot must be updated BY HAND, in the same PR, whenever
// either repo's CSP changes for the /dashboard path — that manual friction is
// the point: it forces the resumeweb side to be updated too, rather than
// letting the two silently diverge again (see docs/decisions.md, "post-cutover
// CSP incident").
//
// Usage: node scripts/check-csp-drift.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");

const vercelConfig = JSON.parse(readFileSync(path.join(repoRoot, "vercel.json"), "utf8"));

const cspEntry = vercelConfig.headers
  ?.flatMap((block) => block.headers ?? [])
  .find((header) => header.key === "Content-Security-Policy");

if (!cspEntry) {
  console.error("check-csp-drift: no Content-Security-Policy header found in vercel.json");
  process.exit(1);
}

const currentCsp = cspEntry.value.trim();
const snapshot = readFileSync(
  path.join(scriptDir, "resumeweb-dashboard-csp.snapshot.txt"),
  "utf8",
).trim();

if (currentCsp !== snapshot) {
  console.error("CSP drift detected between this repo's vercel.json and the committed");
  console.error("resumeweb /dashboard snapshot (scripts/resumeweb-dashboard-csp.snapshot.txt).\n");
  console.error(`This repo's CSP:\n  ${currentCsp}\n`);
  console.error(`resumeweb snapshot:\n  ${snapshot}\n`);
  console.error(
    "If this change is intentional: update resumeweb's own vercel.json /dashboard CSP\n" +
      "to match (it owns victorvaquero.com and proxies /dashboard/* to this app), then\n" +
      "update the snapshot file here to match the new value.",
  );
  process.exit(1);
}

console.log("CSP matches the committed resumeweb /dashboard snapshot.");
