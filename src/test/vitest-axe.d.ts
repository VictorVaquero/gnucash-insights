// vitest-axe@0.1.0's own `extend-expect` subpath augments the old `Vi.Assertion`
// namespace, which no longer merges with Vitest 4's `Assertion` (re-exported from
// `@vitest/expect` via the "vitest" module). Re-declare it here the same way
// `@testing-library/jest-dom/types/vitest.d.ts` does.
import "vitest";

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- must match Assertion's arity to merge
  interface Assertion<T = unknown> {
    toHaveNoViolations(): void;
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): void;
  }
}
