import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "@/test/routerHarness";
import { SideBar } from "./SideBar";

describe("SideBar", () => {
  it("keeps the aside fixed-positioned when collapsed", async () => {
    renderWithRouter(<SideBar isCollapsed toggleSidebar={vi.fn()} />);

    const aside = await screen.findByRole("link", { name: "Home" });
    expect(aside.closest("aside")).toHaveClass("fixed");
  });

  it("keeps the aside fixed-positioned when expanded", async () => {
    renderWithRouter(<SideBar isCollapsed={false} toggleSidebar={vi.fn()} />);

    // Expanded state renders two "Home" links (wordmark + nav item); both live in the aside.
    const homeLinks = await screen.findAllByRole("link", { name: "Home" });
    homeLinks.forEach((link) => expect(link.closest("aside")).toHaveClass("fixed"));
  });

  it("calls toggleSidebar on click and reflects aria-expanded", async () => {
    const user = userEvent.setup();
    const toggleSidebar = vi.fn();
    renderWithRouter(<SideBar isCollapsed toggleSidebar={toggleSidebar} />);

    const toggle = await screen.findByRole("button", { name: "Open menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);
    expect(toggleSidebar).toHaveBeenCalledTimes(1);
  });

  it("reflects aria-expanded=true when expanded", async () => {
    renderWithRouter(<SideBar isCollapsed={false} toggleSidebar={vi.fn()} />);

    const toggle = await screen.findByRole("button", { name: "Close menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });
});
