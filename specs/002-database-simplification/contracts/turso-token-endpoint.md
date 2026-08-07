# Contract: `POST /api/turso-token`

A Vercel Serverless Function, new to this spec (see `plan.md`'s Phase 0). Its only job is
to trade a valid Cognito credential (real user) — or nothing at all (guest, matching
today's behavior) — for a short-lived, read-only Turso database credential. It never
touches financial data itself.

**Correction vs. earlier drafts of this contract**: guest login in today's app
(`useAuth.ts`'s `signInGuest`) is **not a real Cognito authentication** — it sets
`idToken` to the literal string `'guest'`, client-side only, and no Cognito call is ever
made. The guest S3 path today is reached via an *unauthenticated* Cognito Identity Pool
credential (no login required at all), scoped by IAM to only the guest S3 prefix — i.e.
guest data is, and always has been, freely accessible with zero login friction; only the
**real** user's data is Cognito-gated. The endpoint below is corrected to match this,
not to introduce a new guest-auth requirement that doesn't exist today (which would be a
regression in guest UX, not parity).

## Request — real user

```
POST /api/turso-token
Authorization: Bearer <Cognito ID token>
```

The Cognito ID token is the same one already produced by today's `authService.tsx`
sign-in flow. No new identity system is introduced.

## Request — guest

```
POST /api/turso-token
X-Guest-Request: true
```

No Cognito credential presented or checked — matches today's zero-login guest access.
`X-Guest-Request` is not a security boundary (anyone can send it); it only tells the
endpoint which *harmless* database to scope the token to. The real production database
is never reachable via this branch, by construction (see step 3).

## Server-side behavior

1. If `Authorization` is present: verify the ID token's signature against Cognito's JWKS
   endpoint for this app's user pool (`config.json`'s `userPoolId`/`region`) and check
   standard claims (issuer, audience = `clientId`, expiry). On failure (missing beyond
   the guest branch, expired, malformed, wrong audience): respond `401 Unauthorized`, no
   token issued. This is the access-control gate for the **real** database — no
   credential scoped to real financial data is ever issued without a valid Cognito
   token, matching FR-006's "at least as strict as today" bar (today: also zero
   friction for guest, always Cognito-gated for real data).
2. If `Authorization` is absent and `X-Guest-Request: true` is set instead: skip
   verification entirely (there is nothing to verify — parity with today's
   no-login guest path), and proceed directly to minting a token scoped to the
   **guest database only**.
3. Call the Turso Platform API (using a long-lived admin token stored only in a Vercel
   environment variable, never exposed to any client response) to mint a token scoped:
   - **Permission**: read-only (no write capability, ever, from this endpoint)
   - **Target**: exactly one database — the real one (step 1's success path only) or the
     guest one (step 2's path only), never both, and never group-wide. This one-way
     branch is what keeps a guest request from ever reaching real data, regardless of
     what headers a client sends — there is no code path where an unverified request can
     receive a token scoped to the real database.
   - **Lifetime**: short expiration (e.g. `1h`, exact value decided during
     `/speckit-tasks`/implementation) — the browser re-requests a token on session
     refresh rather than holding one indefinitely
4. Respond `200 OK` with the token and that database's URL.

## Response (success)

```json
{
  "url": "libsql://<db-name>-<org>.turso.io",
  "token": "<short-lived read-only JWT>",
  "expiresAt": "2026-08-07T13:00:00.000Z"
}
```

## Response (failure)

```
401 Unauthorized
```

(No body containing partial credentials, error internals, or the admin token under any
circumstance.)

## Non-goals

- This endpoint does **not** proxy or execute any SQL query — the client uses the
  returned token to open its own `drizzle-orm/libsql` connection directly, exactly as it
  opens its own S3 client today with Cognito-scoped credentials. This keeps the
  architecture change minimal (token issuance only), per Phase 0's rejection of a
  full query-proxy API.
- This endpoint does **not** handle the write path. Ingestion writes never go through
  Vercel or this function — see `ingestion-write-contract.md`.
