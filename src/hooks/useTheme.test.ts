import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTheme } from "./useTheme";

function mockMatchMedia(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<() => void>();

  const mql = {
    get matches() {
      return matches;
    },
    media: "(prefers-color-scheme: dark)",
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
  };

  window.matchMedia = vi.fn().mockReturnValue(mql);

  return {
    setMatches: (next: boolean) => {
      matches = next;
      listeners.forEach((cb) => cb());
    },
    listenerCount: () => listeners.size,
  };
}

describe("useTheme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("defaults to system preference, resolving from matchMedia", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useTheme());

    expect(result.current.preference).toBe("system");
    expect(result.current.resolved).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("persists an explicit preference to localStorage and toggles the dark class", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useTheme());

    act(() => result.current.setPreference("dark"));

    expect(result.current.preference).toBe("dark");
    expect(result.current.resolved).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("use-persistent-state-theme")).toBe('"dark"');

    act(() => result.current.setPreference("light"));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("updates live when the system preference changes while on system", () => {
    const media = mockMatchMedia(false);
    const { result } = renderHook(() => useTheme());

    expect(result.current.resolved).toBe("light");

    act(() => media.setMatches(true));
    expect(result.current.resolved).toBe("dark");
  });

  it("removes the matchMedia listener once preference leaves system", () => {
    const media = mockMatchMedia(false);
    const { result } = renderHook(() => useTheme());

    expect(media.listenerCount()).toBe(1);

    act(() => result.current.setPreference("light"));
    expect(media.listenerCount()).toBe(0);
  });
});
