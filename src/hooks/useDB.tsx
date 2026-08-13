import { useRouteContext } from "@tanstack/react-router";
import { useCallback, useContext, useEffect, useMemo } from "react";

import { AppDatabase } from "@/db/dbType";
import { setAccountConfig } from "@/db/utils";
import { DomainContext } from "@/contexts/GlobalContext";
import { setupTursoDB } from "@/services/DbService";
import { fetchTursoToken } from "@/services/tursoService";
import { queryOptions, skipToken, useQuery, useQueryClient } from "@tanstack/react-query";

const TURSO_TOKEN_STALE_MS = 55 * 60 * 1000; // Turso tokens expire in 1h

// A 401/403 here means the caller's Cognito session is dead (expired refresh token, revoked
// session, etc.) -- retrying with the same credentials can't succeed, and react-query's
// default retry+backoff would leave the UI stuck on a spinner for several seconds before
// giving up. Fail immediately so the isError-driven sign-out in main.tsx fires right away.
// Other failures (network blips, 429, 5xx) are still worth a couple of retries.
const isUnrecoverableAuthError = (error: unknown) =>
  error instanceof Error && /Turso token request failed: (401|403)/.test(error.message);

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
    retry: (failureCount, error) => !isUnrecoverableAuthError(error) && failureCount < 2,
  });
};

export const useSetupDB = ({
  user,
  getIdToken,
}: {
  user: string | undefined;
  getIdToken?: () => Promise<string | undefined>;
}) => {
  const { data: tursoToken, isError } = useQuery(tursoTokenOptions({ user, getIdToken }));
  const queryClient = useQueryClient();

  const db: AppDatabase | undefined = useMemo(
    () => (tursoToken ? setupTursoDB({ url: tursoToken.url, token: tursoToken.token }) : undefined),
    [tursoToken],
  );

  useEffect(() => {
    if (tursoToken && user) setAccountConfig(user, tursoToken.accountConfig);
  }, [tursoToken, user]);

  const resetSetupDB = useCallback(() => {
    queryClient.removeQueries({ queryKey: ["tursoToken", user] });
  }, [queryClient, user]);

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
