import { eq, sql } from "drizzle-orm";
import { queryOptions, skipToken } from "@tanstack/react-query";

import type { RegisterSplit } from "@/common/register";
import type { AnyDB } from "../dbType";
import { splitsTable, transactionsTable } from "../schema";

const getRegisterSplitsQuery = <TDB extends AnyDB>(db: TDB, bookId: string) =>
  db
    .select({
      splitId: splitsTable.id,
      transactionId: splitsTable.transactionId,
      accountId: splitsTable.account,
      value: splitsTable.value,
      quantity: splitsTable.quantity,
      memo: splitsTable.memo,
      action: splitsTable.action,
      reconciled: splitsTable.isReconciled,
      date: sql<string>`substr(${transactionsTable.ymdPosted}, 1, 10)`,
      description: transactionsTable.description,
      notes: transactionsTable.slNotes,
    })
    .from(splitsTable)
    .innerJoin(transactionsTable, eq(transactionsTable.id, splitsTable.transactionId))
    .where(eq(transactionsTable.bookId, bookId));

/** Every split of the book with its transaction details, for the account registers. */
export const registerSplitsOptions = <TDB extends AnyDB>(db?: TDB, bookId?: string) => {
  const enabled = !!db && !!bookId;
  return queryOptions({
    queryKey: ["registerSplits", bookId],
    queryFn: !enabled
      ? skipToken
      : async (): Promise<RegisterSplit[]> => getRegisterSplitsQuery(db, bookId).execute(),
    enabled,
  });
};
