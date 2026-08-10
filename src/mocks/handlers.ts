import { http, HttpResponse } from "msw";
import type { TursoTokenResponse } from "@/services/tursoService";

const fakeAccountConfig: TursoTokenResponse["accountConfig"] = {
  expenses: "fake-expenses-guid",
  income: "fake-income-guid",
  checking: "fake-checking-guid",
  savings: "fake-savings-guid",
  assets: "fake-assets-guid",
  working: "fake-working-guid",
  liability: "fake-liability-guid",
  investments: "fake-investments-guid",
  taxes: "fake-taxes-guid",
  taxesAll: ["fake-taxes-guid"],
  tripDesc: "fake-trip-desc",
};

export const handlers = [
  http.post("*/api/turso-token", () => {
    const body: TursoTokenResponse = {
      url: "libsql://fake-test-db.turso.io",
      token: "fake-test-token",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      accountConfig: fakeAccountConfig,
    };
    return HttpResponse.json(body);
  }),
];
