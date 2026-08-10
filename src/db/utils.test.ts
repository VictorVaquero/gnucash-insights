import { describe, expect, it } from "vitest";
import type { AccountConfig } from "@/services/tursoService";
import { getConfig, setAccountConfig } from "./utils";

const CONFIG: AccountConfig = {
  expenses: "expenses-guid",
  income: "income-guid",
  checking: "checking-guid",
  savings: "savings-guid",
  assets: "assets-guid",
  working: "working-guid",
  liability: "liability-guid",
  investments: "investments-guid",
  taxes: "taxes-guid",
  taxesAll: ["taxes-guid"],
  tripDesc: "Trip:",
};

describe("db/utils", () => {
  describe("getConfig / setAccountConfig", () => {
    it("throws when no user is given", () => {
      expect(() => getConfig(undefined)).toThrow("User not defined, cant create query");
    });

    it("throws when the user has no config loaded yet", () => {
      expect(() => getConfig("unregistered-user")).toThrow(
        "Account config not yet loaded for user unregistered-user",
      );
    });

    it("returns the config previously set for that user", () => {
      setAccountConfig("test-user", CONFIG);
      expect(getConfig("test-user")).toEqual(CONFIG);
    });

    it("keeps configs isolated per user", () => {
      const otherConfig: AccountConfig = { ...CONFIG, expenses: "other-expenses-guid" };
      setAccountConfig("user-a", CONFIG);
      setAccountConfig("user-b", otherConfig);

      expect(getConfig("user-a").expenses).toBe("expenses-guid");
      expect(getConfig("user-b").expenses).toBe("other-expenses-guid");
    });
  });
});
