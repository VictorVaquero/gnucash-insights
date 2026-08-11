import "@testing-library/jest-dom/vitest";
// vitest-axe's root "matchers" subpath re-exports as `export type *`, which makes
// toHaveNoViolations type-only there; import the dist file directly for the real value.
// (Its "extend-expect" entry only augments the old `Vi.Assertion` namespace, which no
// longer merges under Vitest 4 -- see src/test/vitest-axe.d.ts for the real typing.)
import { toHaveNoViolations } from "vitest-axe/dist/matchers";
import { afterAll, afterEach, beforeAll, expect } from "vitest";
import { server } from "@/mocks/server";
// Components call useTranslation() unconditionally (e.g. SideBar, login), so it must be
// initialized before any test renders them, same as it's imported in main.tsx.
import "@/i18n/config";

expect.extend({ toHaveNoViolations });

// jsdom doesn't implement matchMedia; useTheme (and anything that renders it, e.g.
// SideBar's ThemeToggle) calls it unconditionally, so every test needs this stub.
// Defaults to "no match" (light/no-preference) since no test asserts dark-mode-specific
// rendering; tests that do care about matchMedia behavior mock it themselves.
const noop = () => undefined;
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: noop,
  removeListener: noop,
  addEventListener: noop,
  removeEventListener: noop,
  dispatchEvent: () => false,
})) as typeof window.matchMedia;

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
