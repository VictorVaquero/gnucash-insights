import { DateRange } from "@/types/domain";
import { AppDatabase } from "@/db/dbType";
import { createContext } from "react";

export const BookContext = createContext<{
  bookId: string | undefined;
  setBookId: (v: string | undefined) => void;
}>({ bookId: undefined, setBookId: () => undefined });

export const DBContext = createContext<{
  db: AppDatabase | undefined;
}>({ db: undefined });

export const DomainContext = createContext<{
  domain: DateRange | undefined;
}>({ domain: undefined });
