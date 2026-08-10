import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createAuthStub, renderWithRouter } from "@/test/routerHarness";
import { AccountMenu } from "./AccountMenu";

describe("AccountMenu", () => {
  it("shows the avatar for an authenticated user, and signs out via the dropdown", async () => {
    const user = userEvent.setup();
    const signOut = vi.fn();
    const auth = createAuthStub({ user: "alice", isAuthenticated: () => true, signOut });

    renderWithRouter(<AccountMenu />, { auth });

    const trigger = await screen.findByRole("button", { name: "A" });
    expect(screen.queryByRole("link", { name: "Log In" })).not.toBeInTheDocument();

    await user.click(trigger);
    const logOut = await screen.findByText("Log Out");
    await user.click(logOut);

    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("shows a Log In link and no dropdown for an unauthenticated user", async () => {
    const auth = createAuthStub({ isAuthenticated: () => false });

    renderWithRouter(<AccountMenu />, { auth });

    expect(await screen.findByRole("link", { name: "Log In" })).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
