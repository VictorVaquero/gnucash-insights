# Contract Amendment: `POST /api/turso-token`

Amends `specs/002-database-simplification/contracts/turso-token-endpoint.md` (still the
base contract — request shapes, the guest/real-user branching, and the "no SQL proxy"
non-goal are unchanged). This spec adds two things to that same endpoint: rate limiting,
and the account-config field described in `data-model.md`.

## What's new

### 1. Response body gains `accountConfig`

**Response (success)** — supersedes the base contract's example:

```json
{
  "url": "libsql://<db-name>-<org>.turso.io",
  "token": "<short-lived read-only JWT>",
  "expiresAt": "2026-08-07T13:00:00.000Z",
  "accountConfig": {
    "expenses": "...",
    "income": "...",
    "checking": "...",
    "savings": "...",
    "assets": "...",
    "working": "...",
    "liability": "...",
    "investments": "...",
    "taxes": "...",
    "taxesAll": ["..."],
    "tripDesc": "..."
  }
}
```

- Real-user branch: `accountConfig` is parsed from the `ACCOUNT_CONFIG_VICTOR` env var
  (server-only, never committed — see `data-model.md` entity 2). A missing/malformed env
  var on this branch is a `500 Server misconfigured` response (same treatment as the
  existing Turso env var check already in the handler), not a partial/undefined
  `accountConfig`.
- Guest branch: `accountConfig` is a hardcoded constant colocated in `api/turso-token.ts`
  (synthetic demo values — not a secret, safe to keep in source).

### 2. Rate limiting

**New response (rate-limited)**:

```
HTTP/1.1 429 Too Many Requests
Retry-After: <seconds>
```

- Applies to both the real-user and guest branches (the abuse surface is "unbounded Turso
  read traffic," which either branch can generate — see `research.md` item 3 and
  `docs/decisions.md`'s "add lightweight rate limiting to `api/turso-token.ts`
  proactively" decision).
- Keyed by client IP (`x-forwarded-for`/`x-real-ip`), not by auth identity — the guest
  branch has no identity to key on, and keying only the real-user branch would leave the
  higher-volume unauthenticated path unprotected.
- Threshold: generous enough that normal rapid navigation (a user opening several routes
  in quick succession, each triggering its own token refresh) never trips it — exact
  number decided at `/speckit-tasks`/implementation per the spec's Edge Cases, verified
  by a scripted-burst test (SC-003).
- A rate-limited response still returns **no** token, URL, or `accountConfig` — same
  "no partial credentials" posture as the base contract's `401` response.

## Unchanged from the base contract

- Request shapes (`Authorization: Bearer <token>` vs. `X-Guest-Request: true`).
- The Cognito verification / guest-branch logic and the guarantee that a guest request
  can never reach the real database (`research.md` item 4's trace).
- `401 Unauthorized` behavior for a missing/invalid/expired real credential.
- The "no SQL proxy" non-goal — this endpoint still only issues a token (+ now,
  account-config data); it never executes a query.
