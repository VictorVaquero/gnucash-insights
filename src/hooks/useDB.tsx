import { fetchDB } from "@/services/DbService";
import { useQuery } from "react-query";
import { useObject } from "./useS3";
import { useContext } from "react";
import { BookContext, DBContext, DomainContext, FileContext } from "@/contexts/GlobalContext";

export const useFetchDB = (fileName: string|undefined) => {
    const { data: isReadyFileDb } = useObject(`gnucash/processed/${fileName}/cash.db`, Boolean(fileName))
    const result = useQuery(['DB'], fetchDB, { enabled: isReadyFileDb, staleTime: Infinity });

    return result
}

export const useDB = () => {
  const context = useContext(DBContext)
  if (!context) {
    throw new Error('useDB must be used within a DBProvider');
  }
  return context
}

export const useFile = () => {
  const context = useContext(FileContext)
  if (!context) {
    throw new Error('useFile must be used within a FileProvider');
  }
  return context
}
export const useBook = () => {
  const context = useContext(BookContext)
  if (!context) {
    throw new Error('useBook must be used within a BookProvider');
  }
  return context
}
export const useDomain = () => {
  const context = useContext(DomainContext)
  if (!context) {
    throw new Error('useDomain must be used within a DomainProvider');
  }
    const latestMonth = context.max?.startOf('month')
    const numMonths = context.max?.diff(context.min!, ['months']).months;
    const numYears = context.max?.diff(context.min!, ['years']).years;
  return {...context, latestMonth, numMonths, numYears}
}