import { SQLJsDatabase } from "drizzle-orm/sql-js";
import { createContext } from "react";

export const FileContext = createContext<{
    fileName: string | undefined,
    setFileName: (v: string | undefined) => void
}>({ fileName: undefined, setFileName: () => { } })

export const BookContext = createContext<{
    bookId: string | undefined,
    setBookId: (v: string | undefined) => void
}>({ bookId: undefined, setBookId: () => { } })

export const DBContext = createContext<{
    db: SQLJsDatabase | undefined
}>({ db: undefined })
