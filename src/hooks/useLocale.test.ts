import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const changeLanguage = vi.fn();
vi.mock("i18next", () => ({
  default: { changeLanguage: (...args: unknown[]) => changeLanguage(...args) },
}));

import { useLocale } from "./useLocale";

function mockNavigatorLanguage(language: string) {
  Object.defineProperty(window.navigator, "language", {
    value: language,
    configurable: true,
  });
}

describe("useLocale", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = "";
    changeLanguage.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("defaults to Spanish when the browser language is Spanish and nothing is persisted", () => {
    mockNavigatorLanguage("es-ES");
    const { result } = renderHook(() => useLocale());

    expect(result.current.locale).toBe("es");
    expect(document.documentElement.lang).toBe("es");
  });

  it("falls back to English when the browser language is unsupported", () => {
    mockNavigatorLanguage("fr-FR");
    const { result } = renderHook(() => useLocale());

    expect(result.current.locale).toBe("en");
  });

  it("prefers a persisted locale over browser detection", () => {
    localStorage.setItem("use-persistent-state-locale", JSON.stringify("es"));
    mockNavigatorLanguage("en-US");
    const { result } = renderHook(() => useLocale());

    expect(result.current.locale).toBe("es");
  });

  it("syncs document.documentElement.lang and persists to localStorage on setLocale", () => {
    mockNavigatorLanguage("en-US");
    const { result } = renderHook(() => useLocale());

    act(() => result.current.setLocale("es"));

    expect(result.current.locale).toBe("es");
    expect(document.documentElement.lang).toBe("es");
    expect(localStorage.getItem("use-persistent-state-locale")).toBe('"es"');
    expect(changeLanguage).toHaveBeenCalledWith("es");
  });
});
