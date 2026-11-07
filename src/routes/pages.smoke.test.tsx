import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { setAccountConfig } from "@/db/utils";
import { createAuthStub, renderWithRouter } from "@/test/routerHarness";

import { RegisterTabs } from "./register/-RegisterTabs";
import { QualitySection } from "@/components/features/QualitySection";
import { InvestmentsPageContextProvider } from "./investments/-investmentsPageContext";
import { useHoldings } from "./investments/-useHoldings";
import { ForecastPlot } from "./summary/-plots/ForecastPlot";
import { CategorySpendPlot } from "./summary/-plots/CategorySpendPlot";
import { SummaryPageContextProvider } from "./summary/-summaryPageContext";

// jsdom has no layout, so the register's virtual list would see a 0px viewport and render no
// rows; give every element a size.
Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, value: 800 });
Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, value: 1200 });

// Smoke tests: mount page-level pieces with only the providers the real route gives them
// (no database), so a missing context provider or a render-time crash fails here instead of
// on the deployed page. Queries stay disabled, so these assert "renders", not data.
const USER = "smoke";
setAccountConfig(USER, {
  expenses: "e",
  income: "i",
  checking: "c",
  savings: "s",
  assets: "a",
  working: "w",
  liability: "l",
  investments: "inv",
  taxes: "t",
  taxesAll: [],
  tripDesc: "trip",
});

// The router renders a render-time throw as a red <pre><code> error block.
const expectNoCrash = async (container: HTMLElement) => {
  await new Promise((r) => setTimeout(r, 50));
  expect(container.querySelector("pre code")?.textContent ?? null).toBeNull();
};

const wrap = (node: ReactNode) => (
  <QueryClientProvider client={new QueryClient()}>{node}</QueryClientProvider>
);

const render = (node: ReactNode) =>
  renderWithRouter(wrap(node), { auth: createAuthStub({ user: USER }) });

const Holdings = () => {
  useHoldings();
  return <p>ok</p>;
};

describe("page smoke", () => {
  it("useHoldings works when used outside the investments page (summary, quality)", async () => {
    const { findByText, container } = render(
      <InvestmentsPageContextProvider>
        <Holdings />
      </InvestmentsPageContextProvider>,
    );
    expect(await findByText("ok")).toBeTruthy();
    await expectNoCrash(container);
  });

  it("renders the data quality section on its own", async () => {
    const { container } = render(<QualitySection />);
    await expectNoCrash(container);
  });

  it("renders summary plots that use investments data", async () => {
    const { container } = render(
      <SummaryPageContextProvider>
        <ForecastPlot />
        <CategorySpendPlot />
      </SummaryPageContextProvider>,
    );
    await expectNoCrash(container);
  });

  it("renders an account register in simple and detailed view", async () => {
    const accounts = [
      { id: "r", name: "Root", parent: null, accountType: "ROOT" },
      { id: "b", name: "Bank", parent: "r", accountType: "BANK" },
      { id: "x", name: "Food", parent: "r", accountType: "EXPENSE" },
    ];
    const base = {
      memo: null,
      action: null,
      reconciled: "n",
      description: "Market",
      notes: null,
      date: "2024-01-10",
      transactionId: "t",
    };
    const splits = [
      { ...base, splitId: "s1", accountId: "x", value: 50, quantity: 50 },
      { ...base, splitId: "s2", accountId: "b", value: -50, quantity: -50 },
    ];
    const { container, findByText, getByRole } = render(
      <RegisterTabs splits={splits} accounts={accounts} tabs={["b"]} active="b" onTabs={vi.fn()} />,
    );
    await expectNoCrash(container);
    expect(await findByText("Market")).toBeTruthy();
    getByRole("button", { name: "Detailed" }).click();
    await expectNoCrash(container);
  });
});
