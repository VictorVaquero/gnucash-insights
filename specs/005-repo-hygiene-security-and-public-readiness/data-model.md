# Phase 1 Data Model: Repo Hygiene, Security Hardening & Public-Repo Readiness

This spec introduces no persistent storage entities (no new database tables/columns —
see `plan.md`'s Technical Context, Storage: N/A). What it does introduce or change is
**config/response shapes** that other code depends on. Documented here instead of a
traditional entity-relationship model.

## 1. `src/config.json` (shrunk shape, post-move)

**Before** (current, committed):

```json
{
  "region": "string",
  "userPoolId": "string",
  "clientId": "string",
  "cognitoUrl": "string",
  "database": { "victor": { "...": "real GnuCash account GUIDs" }, "guest": { "...": "..." } }
}
```

**After** (this spec's target shape — the only fields left):

```json
{
  "region": "string",
  "userPoolId": "string",
  "clientId": "string",
  "cognitoUrl": "string"
}
```

**Validation rules** (`zod`, checked at import time in `src/services/authService.tsx`):
- All four fields: required, non-empty `string`.
- On failure: throw a single `Error` whose message lists every failing field (via
  `ZodError.issues`), not just the first — a config typo should name itself completely.

**Where the removed `database.*` data goes**: see the `AccountConfig` response shape
below — it is no longer file-based config, it's a runtime API response.

## 2. `AccountConfig` (new — server-sourced, not committed)

The shape formerly living at `config.json`'s `database.victor` / `database.guest` keys,
now produced at request time rather than read from a committed file.

```ts
type AccountConfig = {
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
};
```

**Sources**:
- Real user (`victor`): parsed from the `ACCOUNT_CONFIG_VICTOR` Vercel environment
  variable (JSON-encoded string matching this shape) inside `api/turso-token.ts`. Never
  committed to git, never present in the built JS bundle.
- Guest: a hardcoded literal inside `api/turso-token.ts` (or a small co-located constant)
  — these are synthetic demo IDs (`Account29`, etc.), not private data, so keeping them
  in source is fine; only the real mapping needs to leave the repo.

**Validation**: parse `ACCOUNT_CONFIG_VICTOR` with the same kind of `zod` object schema
as item 1 above (required strings + a required `string[]` for `taxesAll`); a malformed/
missing env var on the real-user path should fail loudly (`500`, logged server-side —
mirroring the existing "missing required Turso env vars" check already in
`api/turso-token.ts`) rather than silently sending `undefined` fields to the client.

## 3. `TursoTokenResponse` (changed shape)

**Before** (current, `src/services/tursoService.ts`):

```ts
interface TursoTokenResponse {
  url: string;
  token: string;
  expiresAt: string;
}
```

**After**:

```ts
interface TursoTokenResponse {
  url: string;
  token: string;
  expiresAt: string;
  accountConfig: AccountConfig; // new — see entity 2
}
```

**Consumers to update**: `src/db/utils.ts`'s `getConfig(user)` stops importing
`config.json`'s `database` key and instead reads from wherever the fetched
`TursoTokenResponse` is cached (the existing token-caching mechanism inside
`src/hooks/useDB.tsx`/`useAuth.ts` — exact call site confirmed at implementation time).
Every call site of `getConfig()` (11 files — see `research.md` item 1) is unaffected in
its own signature; only `getConfig`'s internal source of truth changes.

**Full updated contract**: see `contracts/turso-token-endpoint.md`.

## 4. Rate-limit counter state (in-memory, not persisted)

```ts
type RateLimitEntry = {
  count: number;
  resetAt: number; // epoch ms
};
// Map<clientIp, RateLimitEntry>, module-scope inside api/turso-token.ts
```

Not a data model in the persistence sense — module-scope in-memory state, reset
implicitly on cold start, scoped per warm function instance (see `research.md` item 3 for
why this is an acceptable tradeoff at this app's scale). No schema/migration implications.

## 5. Config `$schema` additions (no shape change, editor-only)

`vercel.json`, `tsconfig.json`, `components.json` each gain a `"$schema"` key pointing at
their respective public JSON Schema URL (exact URLs confirmed at implementation time per
`research.md`'s note that shadcn's schema URL is versioned) — additive only, no existing
field changes shape.

## 6. `package.json` additions

- `"license": "MIT"` (new field).
- `"engines": { "node": ">=24" }` — already present, no change (see `research.md` item
  11).
- Removed: `dependencies.better-sqlite3`, `devDependencies["@types/better-sqlite3"]`,
  `devDependencies.webpack`.
