import "@testing-library/jest-dom/vitest";
// vitest-axe's root "matchers" subpath re-exports as `export type *`, which makes
// toHaveNoViolations type-only there; import the dist file directly for the real value.
// (Its "extend-expect" entry only augments the old `Vi.Assertion` namespace, which no
// longer merges under Vitest 4 -- see src/test/vitest-axe.d.ts for the real typing.)
import { toHaveNoViolations } from "vitest-axe/dist/matchers";
import { afterAll, afterEach, beforeAll, expect } from "vitest";
import { server } from "@/mocks/server";

expect.extend({ toHaveNoViolations });

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
