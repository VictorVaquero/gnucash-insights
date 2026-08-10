import { useRouteContext } from "@tanstack/react-router";

export const useAuth = () => {
  const auth = useRouteContext({ from: "__root__", select: (state) => state.auth });
  if (!auth) throw Error("Auth context not set.");
  return auth;
};
