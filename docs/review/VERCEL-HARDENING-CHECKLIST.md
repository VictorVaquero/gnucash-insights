# Vercel hardening checklist — `resumeweb` / `victorvaquero.com`

Follow-up from the 2026-08-10 incident: `victorvaquero.com` briefly served the wrong
deployment because `resumeweb`'s Vercel project had its Production Branch set to `main`
instead of its real default branch, and a related config fix was committed to the wrong
repo (`bro_cv_web`/`PabloVaqueroCVWeb`, which deploys the unrelated `drpablovaquero.com`)
due to a local-folder naming collision. This is owner-run manual verification in the
Vercel dashboard — not something this repo's tooling can check or fix, since it concerns
a different project (`resumeweb`) that this repo does not contain.

## 1. Confirm `resumeweb`'s Production Branch

- Vercel dashboard → `resumeweb` project → **Settings → Git**.
- Confirm **Production Branch** matches the repo's actual default branch (check with
  `git symbolic-ref refs/remotes/origin/HEAD` in the real `resumeweb` checkout — do not
  assume `master` vs `main` without checking).
- If it was set to the wrong branch, that alone can cause an old/unrelated
  branch's last-merged commit to become "production" — this is the likely root cause of
  the incident.

## 2. Confirm which GitHub repo is actually connected

- Same **Settings → Git** page → confirm the connected repository is `resumeweb` (owner's
  resume site), not `PabloVaqueroCVWeb` or any other repo. Project name alone isn't proof
  — verify the linked repo explicitly.
- Do the same check on the `PabloVaqueroCVWeb`/`drpablovaquero.com` Vercel project, to
  confirm it's connected only to `PabloVaqueroCVWeb` and was not accidentally given a
  second domain or a rewrite it shouldn't have.

## 3. Confirm domain → project assignment

- Vercel dashboard → **Domains** (account level) → `victorvaquero.com` → confirm it is
  assigned to the `resumeweb` project only, and to the correct production
  deployment/alias, not a preview deployment or a different project.
- Repeat for `drpablovaquero.com` → should point only at `PabloVaqueroCVWeb`.

## 4. Confirm the `/dashboard` proxy config is actually committed in `resumeweb`

- The original post-cutover incident (`specs/002-database-simplification/spec.md`,
  "Post-cutover incident" section) found this config existed only as a live,
  **uncommitted** manual edit in the domain-owning project — which is what let it drift
  out of sync in the first place.
- In the real `resumeweb` repo, confirm `vercel.json` (or equivalent) has the
  `/dashboard/*` rewrite + CSP header block **committed to git**, not just live in the
  dashboard. If it's still only a manual edit, commit it now — an uncommitted config is
  one accidental redeploy away from silently disappearing.
- Cross-check its CSP against this repo's own `vercel.json` `connect-src` (Cognito +
  `*.turso.io`) — they must match on `/dashboard/*`.

## 5. Clean up the wrong-repo commits (owner-only, `bro_cv_web`/`PabloVaqueroCVWeb`)

- Commits `434b6cf` ("Restore /dashboard rewrite proxy and refresh its CSP for Turso")
  and `840138f` ("Document the /dashboard rewrite proxy and its CSP-sync gotcha") were
  pushed to `PabloVaqueroCVWeb` by mistake and currently leave a `/dashboard` rewrite to
  `cashpy-v2.vercel.app` sitting in `drpablovaquero.com`'s `vercel.json`, plus cashpy-only
  setup notes in that repo's docs.
- This repo does not touch `bro_cv_web`/`PabloVaqueroCVWeb` — revert or clean up those
  commits directly in that repo when convenient (not urgent unless `drpablovaquero.com`
  is currently misbehaving because of it).

## 6. Optional: reduce future name-collision risk

- Consider renaming the local folder `bro_cv_web` to match its actual repo
  (`PabloVaqueroCVWeb` or similar) so it can't be mistaken for `resumeweb` again in a
  future session, in this or any other tool.
