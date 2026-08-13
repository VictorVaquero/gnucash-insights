import { refreshTokenAws, signInAws } from "@/services/authService";
import { useCallback, useMemo } from "react";
import { usePersistentState } from "./usePersistentState";

// Refresh a bit before the token actually expires so an in-flight request doesn't cross
// the boundary and get rejected mid-flight.
const REFRESH_MARGIN_SECONDS = 60;

// Cognito's `ExpiresIn` is a duration in seconds from "now", not an absolute timestamp --
// convert it once at the point we receive it so everything downstream compares timestamps.
const toExpiresAt = (expiresInSeconds: number | undefined) =>
  expiresInSeconds === undefined ? undefined : Math.floor(Date.now() / 1000) + expiresInSeconds;

export const useAuthSetup = () => {
  const [user, setUser] = usePersistentState<string | undefined>("user");
  const [idToken, setIdToken] = usePersistentState<string | undefined>("idToken");
  const [refreshToken, setRefreshToken] = usePersistentState<string | undefined>("refreshToken");
  const [expiresAt, setExpiresAt] = usePersistentState<number | undefined>("expiresAt");

  const signIn = useCallback(
    async (username: string, password: string) => {
      const AuthenticationResult = await signInAws(username, password);
      setUser(username);
      setIdToken(AuthenticationResult.IdToken);
      setRefreshToken(AuthenticationResult.RefreshToken);
      setExpiresAt(toExpiresAt(AuthenticationResult.ExpiresIn));
      console.debug("Sign in successful");
    },
    [setUser, setIdToken, setRefreshToken, setExpiresAt],
  );

  const signInGuest = useCallback(async () => {
    setUser("guest");
    setIdToken("guest");
    setRefreshToken(undefined);
    setExpiresAt(undefined);
    console.debug("Guest sign in successful");
  }, [setUser, setIdToken, setRefreshToken, setExpiresAt]);

  const refresh = useCallback(async () => {
    const AuthenticationResult = await refreshTokenAws(refreshToken);
    setIdToken(AuthenticationResult.IdToken);
    // Cognito only returns a new RefreshToken when refresh-token rotation is enabled on the
    // app client; ours isn't, so a refresh response omits it. Overwriting the existing
    // refresh token with that `undefined` permanently breaks all future refreshes for the
    // rest of the session, forcing a full re-login the next time the id token expires --
    // keep the current one whenever Cognito doesn't hand back a new one.
    setRefreshToken(AuthenticationResult.RefreshToken ?? refreshToken);
    setExpiresAt(toExpiresAt(AuthenticationResult.ExpiresIn));
    console.debug("Refresh tokens");
    return AuthenticationResult.IdToken;
  }, [refreshToken, setIdToken, setRefreshToken, setExpiresAt]);

  const signOut = useCallback(() => {
    setUser(undefined);
    setIdToken(undefined);
    setRefreshToken(undefined);
    setExpiresAt(undefined);
    console.debug("Sign out successful");
  }, [setUser, setIdToken, setRefreshToken, setExpiresAt]);

  const getIdToken = useCallback(async () => {
    if (!idToken) throw Error("User not authenticated");
    const isExpiringSoon =
      !expiresAt || expiresAt - REFRESH_MARGIN_SECONDS <= Math.floor(Date.now() / 1000);
    if (!!refreshToken && isExpiringSoon) return await refresh();
    return idToken;
  }, [idToken, refreshToken, expiresAt, refresh]);

  const isAuthenticated = useCallback(() => {
    return !!user || !!idToken;
  }, [user, idToken]);

  return useMemo(
    () => ({ user, getIdToken, signIn, signInGuest, signOut, isAuthenticated }),
    [user, getIdToken, signIn, signInGuest, signOut, isAuthenticated],
  );
};
