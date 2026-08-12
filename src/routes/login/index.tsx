import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { getErrorMessage } from "@/common/utils";
import { ErrorModal } from "@/components/ErrorModal";
import { useAuth } from "@/contexts/useAuthContext";

interface LoginSearch {
  redirect: string;
}

export const LoginPage = () => {
  const { t } = useTranslation();
  const { isAuthenticated, signIn, signInGuest } = useAuth();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [isVisible, setVisible] = useState(false);
  const [msg, setMsg] = useState("");

  const router = useRouter();
  const search = Route.useSearch({});

  const handleSignIn = useCallback(
    async (e: { preventDefault: () => void }) => {
      e.preventDefault();
      try {
        await signIn(user, password);
        router.navigate({ to: search.redirect });
      } catch (error) {
        setMsg(getErrorMessage(error));
        setVisible(true);
      }
    },
    [signIn, user, password, router, search.redirect],
  );
  const handleGuestSignIn = useCallback(
    async (e: { preventDefault: () => void }) => {
      e.preventDefault();
      signInGuest();
      router.navigate({ to: search.redirect });
    },
    [signInGuest, router, search.redirect],
  );
  const handleUserChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setUser(e.target.value),
    [],
  );
  const handlePasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value),
    [],
  );

  useEffect(() => {
    if (isAuthenticated()) router.navigate({ to: search.redirect });
  }, [isAuthenticated, router, search.redirect]);

  return (
    <div className="h-full min-h-fit flex justify-center items-center overflow-y-auto py-6">
      <div className="text-secondary-foreground p-10 py-6 bg-secondary rounded">
        <h1 className="sr-only">{t("routes.login.title")}</h1>
        <form className="pt-4" onSubmit={handleSignIn}>
          <div>
            <label htmlFor="user" className="sr-only">
              {t("login.form.email")}
            </label>
            <input
              className="p-4 bg-background text-foreground focus-visible:outline focus-visible:outline-ring focus-visible:outline-1"
              name="user"
              id="user"
              type="user"
              value={user}
              onChange={handleUserChange}
              placeholder={t("login.form.email")}
              autoComplete="off"
              required
            />
          </div>
          <div className="mt-2">
            <label htmlFor="password" className="sr-only">
              {t("login.form.password")}
            </label>
            <input
              className="inputText p-4 bg-background text-foreground focus-visible:outline focus-visible:outline-ring focus-visible:outline-1"
              name="password"
              id="password"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              placeholder={t("login.form.password")}
              autoComplete="off"
              required
            />
          </div>
          <div className="pt-4 flex flex-row justify-between">
            <button
              className="p-3 px-4 rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              type="button"
              onClick={handleGuestSignIn}
            >
              {t("login.actions.guest")}
            </button>
            <button
              className="p-3 px-4 rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              type="submit"
            >
              {t("login.actions.signIn")}
            </button>
          </div>
        </form>
        <ErrorModal msg={msg} isVisible={isVisible} setVisible={setVisible} />
      </div>
    </div>
  );
};

export const Route = createFileRoute("/login/")({
  component: LoginPage,
  validateSearch: (search: Record<string, unknown>): LoginSearch => {
    return { redirect: (search.redirect as string) || "/summary" };
  },
  beforeLoad: async () => {
    return { title: "routes.login.title" };
  },
});
