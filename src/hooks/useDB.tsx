import { useRouteContext } from "@tanstack/react-router";
import { useContext, useEffect, useState } from "react";

import { AppDatabase } from "@/db/dbType";
import { DomainContext, FileContext } from "@/contexts/GlobalContext";
import {
  fetchDBOptions,
  removeFile,
  saveFile,
  setupDB,
  setupTursoDB,
} from "@/services/DbService";
import { fetchTursoToken } from "@/services/tursoService";
import { CognitoIdentityCredentialProvider } from "@aws-sdk/credential-providers";
import { queryOptions, skipToken, useQuery } from "@tanstack/react-query";

// Reversible-cutover toggle (constitution Principle I): "s3" is the current,
// proven path; "turso" is the new path while it's being verified. Both stay
// live at once so rollback is just leaving/setting this back to "s3" — no
// data or infra needs to be undone. Removed once the migration cuts over.
const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE ?? "s3";

const TURSO_TOKEN_STALE_MS = 55 * 60 * 1000; // Turso tokens expire in 1h

const tursoTokenOptions = ({
  user,
  getIdToken,
}: {
  user: string | undefined;
  getIdToken: (() => Promise<string | undefined>) | undefined;
}) => {
  const enabled = DATA_SOURCE === "turso" && !!user && !!getIdToken;
  return queryOptions({
    queryKey: ["tursoToken", user],
    queryFn: !enabled
      ? skipToken
      : async () => {
          const idToken = await getIdToken();
          if (!idToken) throw new Error("No Cognito ID token available");
          return fetchTursoToken({ idToken });
        },
    enabled,
    staleTime: TURSO_TOKEN_STALE_MS,
  });
};

export const useSetupDB = ({
  fileName,
  user,
  credentials,
  getIdToken,
}: {
  fileName: string | undefined;
  user: string | undefined;
  credentials?: CognitoIdentityCredentialProvider;
  getIdToken?: () => Promise<string | undefined>;
}) => {
  const [db, setDB] = useState<AppDatabase>();

  const { data: s3Data, isError: isS3Error } = useQuery({
    ...fetchDBOptions({ fileName, user, credentials }),
    enabled: DATA_SOURCE === "s3" && !!fileName && !!user && !!credentials,
  });

  const { data: tursoToken, isError: isTursoError } = useQuery(
    tursoTokenOptions({ user, getIdToken })
  );

  useEffect(() => {
    if (DATA_SOURCE !== "s3") return;
    const f = async () => {
      if (s3Data) {
        await saveFile(s3Data);
        setDB(await setupDB());
      }
    };
    f().catch(() => console.error("Error in db setup"));
  }, [s3Data]);

  useEffect(() => {
    if (DATA_SOURCE !== "turso") return;
    if (tursoToken) {
      setDB(setupTursoDB({ url: tursoToken.url, token: tursoToken.token }));
    }
  }, [tursoToken]);

  const resetSetupDB = () => {
    setDB(undefined);
    if (DATA_SOURCE === "s3") removeFile();
  };

  const isError = DATA_SOURCE === "turso" ? isTursoError : isS3Error;
  return { data: db, isError, resetSetupDB };
};

export const useDB = () => {
  return {
    db: useRouteContext({ from: "__root__", select: (state) => state.db }),
  };
};

export const useFile = () => {
  const context = useContext(FileContext);
  if (!context) {
    throw new Error("useFile must be used within a FileProvider");
  }
  return context;
};
export const useBook = () => {
  return {
    bookId: useRouteContext({
      from: "__root__",
      select: (state) => state.bookId,
    }),
  };
};
export const useDomain = () => {
  const context = useContext(DomainContext);
  if (!context) {
    throw new Error("useDomain must be used within a DomainProvider");
  }
  const { domain } = context;
  const latestMonth = domain?.to.startOf("month");
  const numMonths = domain?.to.diff(domain.from, ["months"]).months;
  const numYears = domain?.to.diff(domain.from, ["years"]).years;
  return { ...domain, latestMonth, numMonths, numYears };
};
