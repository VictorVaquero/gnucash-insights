import { useRouteContext } from "@tanstack/react-router";
import { useContext, useEffect, useState } from "react";

import { ReturnedPromiseResolvedType } from "@/common/types";
import { DomainContext, FileContext } from "@/contexts/GlobalContext";
import { fetchDBOptions, removeFile, saveFile, setupDB } from "@/services/DbService";
import { CognitoIdentityCredentialProvider } from "@aws-sdk/credential-providers";
import { useQuery } from "@tanstack/react-query";

export const useSetupDB = ({ fileName, user, credentials }: { fileName: string | undefined, user: string | undefined, credentials?: CognitoIdentityCredentialProvider, enabled?: boolean }) => {
  const [db, setDB] = useState<ReturnedPromiseResolvedType<typeof setupDB>>();
  const { data, isError } = useQuery(fetchDBOptions({ fileName, user, credentials }))

  useEffect(() => {
    const f = async () => {
      if (data) {
        await saveFile(data)
        setDB(await setupDB())
      }
    }
    f().catch(() => console.error('Error in db setup'))
  }, [data])

  const resetSetupDB = () => {
    setDB(undefined);
    removeFile()
  }


  return { data: db, isError, resetSetupDB }
}

export const useDB = () => { return { db: useRouteContext({ from: '__root__', select: (state) => state.db }) } }

export const useFile = () => {
  const context = useContext(FileContext)
  if (!context) {
    throw new Error('useFile must be used within a FileProvider');
  }
  return context
}
export const useBook = () => { return { bookId: useRouteContext({ from: '__root__', select: (state) => state.bookId }) } }
export const useDomain = () => {
  const context = useContext(DomainContext)
  if (!context) {
    throw new Error('useDomain must be used within a DomainProvider');
  }
  const { domain } = context;
  const latestMonth = domain?.max.startOf('month')
  const numMonths = domain?.max.diff(domain.min, ['months']).months;
  const numYears = domain?.max.diff(domain.min, ['years']).years;
  return { ...domain, latestMonth, numMonths, numYears }
}