import { refreshTokenAws, signInAws } from "@/services/authService";
import { useCallback, useMemo } from "react";
import { usePersistentState } from "./usePersistentState";

export const useAuthSetup = () => {
  const [user, setUser] = usePersistentState<string | undefined>("user");
  const [idToken, setIdToken] = usePersistentState<string | undefined>("idToken");
  const [refreshToken, setRefreshToken] = usePersistentState<string | undefined>("refreshToken");
  const [expiresIn, setExpiresIn] = usePersistentState<number | undefined>("expiresIn");

  const signIn = useCallback(
    async (username: string, password: string) => {
      const AuthenticationResult = await signInAws(username, password);
      setUser(username);
      setIdToken(AuthenticationResult.IdToken);
      setRefreshToken(AuthenticationResult.RefreshToken);
      setExpiresIn(AuthenticationResult.ExpiresIn);
      console.debug("Sign in successful");
    },
    [setUser, setIdToken, setRefreshToken, setExpiresIn],
  );

  const signInGuest = useCallback(async () => {
    setUser("guest");
    setIdToken("guest");
    setRefreshToken(undefined);
    setExpiresIn(undefined);
    console.debug("Guest sign in successful");
  }, [setUser, setIdToken, setRefreshToken, setExpiresIn]);

  const refresh = useCallback(async () => {
    const AuthenticationResult = await refreshTokenAws(refreshToken);
    setIdToken(AuthenticationResult.IdToken);
    setRefreshToken(AuthenticationResult.RefreshToken);
    setExpiresIn(AuthenticationResult.ExpiresIn);
    console.debug("Refresh tokens");
    return AuthenticationResult.IdToken;
  }, [refreshToken, setIdToken, setRefreshToken, setExpiresIn]);

  const signOut = useCallback(() => {
    setUser(undefined);
    setIdToken(undefined);
    setRefreshToken(undefined);
    setExpiresIn(undefined);
    console.debug("Sign out successful");
  }, [setUser, setIdToken, setRefreshToken, setExpiresIn]);

  const getIdToken = useCallback(async () => {
    if (!idToken) throw Error("User not authenticated");
    if (!!refreshToken && !!expiresIn && expiresIn >= Math.floor(Date.now() / 1000))
      return await refresh();
    return idToken;
  }, [idToken, refreshToken, expiresIn, refresh]);

  const isAuthenticated = useCallback(() => {
    return !!user || !!idToken;
  }, [user, idToken]);

  return useMemo(
    () => ({ user, getIdToken, signIn, signInGuest, signOut, isAuthenticated }),
    [user, getIdToken, signIn, signInGuest, signOut, isAuthenticated],
  );
};
