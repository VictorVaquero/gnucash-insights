import { refreshTokenAws, signInAws } from "@/services/authService";
import { usePersistentState } from "./usePersistentState";

export const useAuthSetup = () => {
    const [user, setUser] = usePersistentState<string | undefined>('user');
    const [idToken, setIdToken] = usePersistentState<string | undefined>('idToken');
    const [refreshToken, setRefreshToken] = usePersistentState<string | undefined>('refreshToken');
    const [expiresIn, setExpiresIn] = usePersistentState<number | undefined>('expiresIn');


    const signIn = async (username: string, password: string) => {
        const AuthenticationResult = await signInAws(username, password)
        setUser(username)
        setIdToken(AuthenticationResult.IdToken)
        setRefreshToken(AuthenticationResult.RefreshToken)
        setExpiresIn(AuthenticationResult.ExpiresIn)
        console.debug('Sign in successful')
    }

    const signInGuest = async () => {
        setUser('guest')
        setIdToken('guest')
        setRefreshToken(undefined)
        setExpiresIn(undefined)
        console.debug('Guest sign in successful')
    }

    const refresh = async () => {
        const AuthenticationResult = await refreshTokenAws(refreshToken)
        setIdToken(AuthenticationResult.IdToken)
        setRefreshToken(AuthenticationResult.RefreshToken)
        setExpiresIn(AuthenticationResult.ExpiresIn)
        console.debug('Refresh tokens')
        return AuthenticationResult.IdToken;
    }

    const signOut = () => {
        setUser(undefined)
        setIdToken(undefined)
        setRefreshToken(undefined)
        setExpiresIn(undefined)
        console.debug('Sign out successful')
    }

    const getIdToken = async () => {
        if (!idToken) throw Error('User not authenticated');
        if (!!refreshToken && !!expiresIn && (expiresIn >= Math.floor(Date.now() / 1000))) return await refresh();
        return idToken
    }

    const isAuthenticated = () => {
        return !!user || !!idToken;
    }

    return { user, getIdToken, signIn, signInGuest, signOut, isAuthenticated }
}