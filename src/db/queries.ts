import { SQLJsDatabase } from "drizzle-orm/sql-js"

import { booksTable, transactionsTable } from "./schema"
import { max, min } from "drizzle-orm";

export const getBooks = (db: SQLJsDatabase) => { return db.select().from(booksTable).all(); }
export const getDomain = (db: SQLJsDatabase) => {
    return db.select({
        min: min(transactionsTable.datePosted),
        max: max(transactionsTable.datePosted),
    })
        .from(transactionsTable)
        .all()[0];
}