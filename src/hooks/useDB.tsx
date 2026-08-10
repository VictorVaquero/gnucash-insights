import { useRouteContext } from "@tanstack/react-router";
import { useContext, useEffect, useState } from "react";

import { AppDatabase } from "@/db/dbType";
import { setAccountConfig } from "@/db/utils";
import { DomainContext } from "@/contexts/GlobalContext";
import { setupTursoDB } from "@/services/DbService";
import { fetchTursoToken } from "@/services/tursoService";
import { queryOptions, skipToken, useQuery } from "@tanstack/react-query";

const TURSO_TOKEN_STALE_MS = 55 * 60 * 1000; // Turso tokens expire in 1h

const tursoTokenOptions = ({
  user,
  getIdToken,
}: {
  user: string | undefined;
  getIdToken: (() => Promise<string | undefined>) | undefined;
}) => {
  const enabled = !!user && !!getIdToken;
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
  user,
  getIdToken,
}: {
  user: string | undefined;
  getIdToken?: () => Promise<string | undefined>;
}) => {
  const [db, setDB] = useState<AppDatabase>();

  const { data: tursoToken, isError } = useQuery(tursoTokenOptions({ user, getIdToken }));

  useEffect(() => {
    if (tursoToken) {
      setDB(setupTursoDB({ url: tursoToken.url, token: tursoToken.token }));
      if (user) setAccountConfig(user, tursoToken.accountConfig);
    }
  }, [tursoToken, user]);

  const resetSetupDB = () => {
    setDB(undefined);
  };

  return { data: db, isError, resetSetupDB };
};

export const useDB = () => {
  return {
    db: useRouteContext({ from: "__root__", select: (state) => state.db }),
  };
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
