# Quickstart: Verifying the Vercel Migration

Manual validation guide — no automated test suite exists for this app (see plan.md
Technical Context). Run through this after implementation, both locally and against the
deployed Vercel preview/production URLs.

## Prerequisites

- `pnpm install` completed
- Vercel CLI installed and authenticated (`pnpm dlx vercel login`), or access to the
  Vercel dashboard for the account already hosting resumeweb
- Real login credentials for the dashboard (owner account) to test User Story 2

## 1. Local build sanity check

```bash
pnpm run build
pnpm run preview
```

- Open the printed preview URL, append `/dashboard/` (matches the configured `base`).
- Confirm the app loads and the login screen renders. This validates the build itself is
  unaffected by any config changes before involving Vercel at all.

## 2. Deploy `cashpy_v2` as its own Vercel project

```bash
pnpm dlx vercel link      # one-time, connects this repo to a new Vercel project
pnpm dlx vercel --prod    # or: push to the connected branch and let git-integration deploy
```

- Note the assigned production URL (`https://<project>.vercel.app`).
- Visit `https://<project>.vercel.app/dashboard` directly.
  - **Expected**: app loads (User Story 1, partial — direct host, not yet the final
    domain).
  - Refresh on a deep route, e.g. `https://<project>.vercel.app/dashboard/summary`.
    **Expected**: loads directly, no 404 (FR-004 / SPA fallback rewrite).

## 3. Wire up the domain rewrite in resumeweb

- In the `resumeweb` repo, add the `rewrites` block from `research.md` to `vercel.json`,
  pointing at the URL noted in step 2.
- Deploy resumeweb (push to its default branch, or `vercel --prod` there).
- Visit `https://victorvaquero.com/dashboard`.
  - **Expected**: same app as step 2, now under the real domain (User Story 1, complete).
  - Refresh on a deep route under the real domain, e.g.
    `https://victorvaquero.com/dashboard/summary`. **Expected**: loads directly.

## 4. Authenticated user path (User Story 2)

- On `https://victorvaquero.com/dashboard`, log in with real owner credentials.
- **Expected**: login succeeds; summary, expenses, travels, and investments pages all
  render data with charts populated, matching what the old CloudFront-hosted app showed
  for the same account.
- Open browser devtools → Network tab; confirm no CSP violations logged in the console
  (validates the `connect-src` adjustment in research.md actually allows Cognito/S3
  calls).

## 5. Guest path (User Story 3)

- Log out, select the guest/demo login option.
- **Expected**: sample data loads and renders identically to the pre-migration behavior.

## 6. Preview deployments (User Story 4)

- Push a throwaway branch/commit to `cashpy_v2` (e.g. a whitespace change).
- **Expected**: Vercel creates a preview deployment at a distinct URL, reachable
  independently, without affecting `https://victorvaquero.com/dashboard`.

## 7. Security headers check

```bash
curl -I https://victorvaquero.com/dashboard
```

- **Expected**: response headers include `Content-Security-Policy`,
  `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin` (FR-006).

## 8. Confirm no secrets committed

```bash
git log --all -p -- vercel.json .nvmrc | grep -iE "secret|token|password|key"
```

- **Expected**: no matches (FR-007, SC-006). (This is a coarse grep, not a substitute for
  reviewing the actual diffs by eye before pushing.)

## Sign-off

Migration is complete when steps 1–8 all pass, and the old AWS S3/CloudFront hosting for
this app is scheduled for decommission (FR-009) — kept alive but no longer the
authoritative URL.
