## Summary

## Checklist

- [ ] Tested locally (`pnpm dev` / relevant `pnpm test` suite)
- [ ] Touches `src/config.json` or any secret/credential path
- [ ] Touches the cross-repo CSP coupling with `resumeweb` (see [005](../specs/005-repo-hygiene-security-and-public-readiness/spec.md) research.md item 6 / `scripts/check-csp-drift.mjs`)
