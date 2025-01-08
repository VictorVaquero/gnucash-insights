import { fetchDB } from "@/services/DbService";
import { useQuery } from "react-query";
import { useObject } from "./useS3";
import { useContext } from "react";
import { BookContext, DBContext, FileContext } from "@/contexts/GlobalContext";

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