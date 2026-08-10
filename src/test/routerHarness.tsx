import type { ReactNode } from "react";
import { vi } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRouteWithContext,
  createRouter,
} from "@tanstack/react-router";

export interface AuthStub {
  user?: string;
  getIdToken: () => Promise<string>;
  signIn: () => Promise<void>;
  signInGuest: () => Promise<void>;
  signOut: () => void;
  isAuthenticated: () => boolean;
}

/** A stub matching the shape of `useAuthSetup`'s return value (src/hooks/useAuth.ts). */
export const createAuthStub = (overrides: Partial<AuthStub> = {}): AuthStub => ({
  user: undefined,
  getIdToken: vi.fn(),
  signIn: vi.fn(),
  signInGuest: vi.fn(),
  signOut: vi.fn(),
  isAuthenticated: () => false,
  ...overrides,
});

interface HarnessContext {
  auth?: AuthStub;
  title: string;
  queryClient: QueryClient;
}

/**
 * Renders `ui` as the component of a memory-history root route, so components
 * relying on `Link`/`useRouterState`/`useRouteContext({ from: "__root__" })`
 * (AccountMenu, SideBar, ...) work the same as they do mounted under the real router.
 */
export const renderWithRouter = (
  ui: ReactNode,
  { auth, initialPath = "/" }: { auth?: AuthStub; initialPath?: string } = {},
) => {
  const rootRoute = createRootRouteWithContext<HarnessContext>()({
    component: () => ui,
  });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
    context: { auth, title: "Test", queryClient: new QueryClient() },
  });

  return render(<RouterProvider router={router} />);
};
