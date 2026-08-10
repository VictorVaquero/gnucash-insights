import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router";
import { axe } from "vitest-axe";
import { createAuthStub } from "@/test/routerHarness";
import { routeTree } from "@/routeTree.gen";

// The login route's `Route.useSearch` only resolves against the real, plugin-generated
// route tree (routeTree.gen.ts) — a synthetic root+child tree like routerHarness.tsx
// uses elsewhere hits a "Duplicate routes found with id: __root__" error, since
// createFileRoute's parent-wiring is injected by the tanstackRouter() Vite plugin, which
// vitest.config.ts doesn't run. So this mounts the whole app router at "/login/" instead.
describe("LoginPage", () => {
  it("labels both inputs and has no axe violations", async () => {
    const auth = createAuthStub({ isAuthenticated: () => false });
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ["/login/"] }),
      context: { title: "Test", queryClient: new QueryClient() },
    });

    const { container } = render(
      <RouterProvider router={router} context={{ auth, db: undefined, bookId: undefined }} />,
    );

    expect(await screen.findByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
