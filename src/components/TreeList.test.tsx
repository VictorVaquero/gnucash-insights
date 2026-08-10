import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TreeList } from "./TreeList";

const leaf = (key: string, header: string) => ({
  key,
  header,
  node: <span>{`node-${key}`}</span>,
  children: [],
  depth: 1,
});

const data = [
  {
    key: "parent",
    header: "Parent",
    node: <span>node-parent</span>,
    depth: 0,
    children: [leaf("child-1", "Child 1"), leaf("child-2", "Child 2")],
  },
];

describe("TreeList", () => {
  it("hides children until the parent row is clicked, then shows them", async () => {
    const user = userEvent.setup();
    render(<TreeList data={data} />);

    expect(screen.getByText("Parent")).toBeInTheDocument();
    expect(screen.queryByText("Child 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Child 2")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Parent/ }));

    expect(await screen.findByText("Child 1")).toBeInTheDocument();
    expect(screen.getByText("Child 2")).toBeInTheDocument();
  });

  it("toggles children back off on a second click", async () => {
    const user = userEvent.setup();
    render(<TreeList data={data} />);

    const toggle = screen.getByRole("button", { name: /Parent/ });
    await user.click(toggle);
    expect(await screen.findByText("Child 1")).toBeInTheDocument();

    await user.click(toggle);
    await waitFor(() => expect(screen.queryByText("Child 1")).not.toBeInTheDocument());
  });

  it("renders a leaf row (no children) as plain content with no toggle button", () => {
    render(<TreeList data={[leaf("only", "Only Leaf")]} />);

    expect(screen.getByText("Only Leaf")).toBeInTheDocument();
    expect(screen.getByText("node-only")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
