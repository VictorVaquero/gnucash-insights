import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DateTime } from "luxon";
import type { ColumnFiltersState } from "@tanstack/react-table";
import type { FullTransaction } from "..";
import { TransactTable } from "./TransactsTable";

// TransactTable's own useColumnFilters syncs to the "/analysis/" route's search params, which
// requires a real router match for that route id. Pagination is independent of that syncing, so
// it's stubbed here with plain local state to keep this test focused on pagination behavior.
vi.mock("./useColumnFilters", () => ({
  useColumnFilters: () => {
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    return { columnFilters, setColumnFilters };
  },
}));

const noop: CallableFunction = () => undefined;

const ROW_COUNT = 12;
const data: FullTransaction[] = Array.from({ length: ROW_COUNT }, (_, i) => ({
  accountId: "account-1",
  accountType: "EXPENSE",
  accountName: "Groceries",
  transactionId: `txn-${i}`,
  datePosted: DateTime.fromISO("2023-01-01").plus({ days: i }),
  ymdPosted: `2023-01-${String(i + 1).padStart(2, "0")}`,
  splitId: `split-${i}`,
  description: `Row ${i}`,
  slNotes: null,
  value: -10 - i,
}));

describe("TransactTable", () => {
  it("shows only the first page (8 rows) by default", () => {
    render(<TransactTable data={data} setFilteredData={noop} />);

    for (let i = 0; i < 8; i++) expect(screen.getByText(`Row ${i}`)).toBeInTheDocument();
    for (let i = 8; i < ROW_COUNT; i++)
      expect(screen.queryByText(`Row ${i}`)).not.toBeInTheDocument();
  });

  it("shows the next page of rows when the next-page control is clicked", async () => {
    const user = userEvent.setup();
    render(<TransactTable data={data} setFilteredData={noop} />);

    await user.click(screen.getByRole("button", { name: ">" }));

    for (let i = 0; i < 8; i++) expect(screen.queryByText(`Row ${i}`)).not.toBeInTheDocument();
    for (let i = 8; i < ROW_COUNT; i++) expect(screen.getByText(`Row ${i}`)).toBeInTheDocument();
  });

  it("shows more rows when a larger page size is selected", async () => {
    const user = userEvent.setup();
    render(<TransactTable data={data} setFilteredData={noop} />);

    await user.selectOptions(screen.getByRole("combobox"), "20");

    for (let i = 0; i < ROW_COUNT; i++) expect(screen.getByText(`Row ${i}`)).toBeInTheDocument();
  });

  it("jumps to the requested page via the go-to-page input", async () => {
    const user = userEvent.setup();
    render(<TransactTable data={data} setFilteredData={noop} />);

    const pageInput = screen.getByRole("spinbutton");
    await user.clear(pageInput);
    await user.type(pageInput, "2");

    for (let i = 0; i < 8; i++) expect(screen.queryByText(`Row ${i}`)).not.toBeInTheDocument();
    for (let i = 8; i < ROW_COUNT; i++) expect(screen.getByText(`Row ${i}`)).toBeInTheDocument();
  });
});
