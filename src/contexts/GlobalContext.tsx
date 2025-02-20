import { SQLJsDatabase } from "drizzle-orm/sql-js";
import { DateTime } from "luxon";
import { createContext } from "react";

export const FileContext = createContext<{
    fileName: string | undefined,
    setFileName: (v: string | undefined) => void
}>({ fileName: undefined, setFileName: () => undefined })

export const BookContext = createContext<{
    bookId: string | undefined,
    setBookId: (v: string | undefined) => void
}>({ bookId: undefined, setBookId: () => undefined })

export const DBContext = createContext<{
    db: SQLJsDatabase | undefined
}>({ db: undefined })

export const DomainContext = createContext<{
    domain: {
        min: DateTime<boolean>, max: DateTime<boolean>
    } | undefined
}>({ domain: undefined })