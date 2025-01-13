import { sqliteView, text, integer } from "drizzle-orm/sqlite-core";


export const accountsClosure = sqliteView('accountsClosure', {
  bookId: text().notNull(),
  parent: text().notNull(),
  child: text().notNull(),
  depth: integer().notNull()
}).existing();
