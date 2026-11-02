import { describe, expect, it } from "vitest";
import { withDescendants } from "./useOutliers";

describe("withDescendants", () => {
  it("adds children at any depth and ignores unrelated accounts", () => {
    const accounts = [
      { id: "a", parent: null },
      { id: "b", parent: "a" },
      { id: "c", parent: "b" },
      { id: "x", parent: "z" },
    ];
    expect(withDescendants(["a"], accounts).sort()).toEqual(["a", "b", "c"]);
    expect(withDescendants([], accounts)).toEqual([]);
  });
});
