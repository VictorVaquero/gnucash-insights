import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  faEnvelope,
  faEye,
  faEyeSlash,
  faLock,
  faTriangleExclamation,
  faWallet,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { getErrorMessage } from "@/common/utils";
import { useAuth } from "@/contexts/useAuthContext";

interface LoginSearch {
  redirect: string;
}

const CARD_INITIAL = { opacity: 0, y: 12 };
const CARD_ANIMATE = { opacity: 1, y: 0 };
const CARD_TRANSITION = { duration: 0.5, ease: "easeOut" };
const ERROR_INITIAL = { opacity: 0, height: 0 };
const ERROR_ANIMATE = { opacity: 1, height: "auto" };
const ERROR_EXIT = { opacity: 0, height: 0 };

const SignInError = ({ message }: { message: string }) => {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      <motion.div
        initial={ERROR_INITIAL}
        animate={ERROR_ANIMATE}
        exit={ERROR_EXIT}
        role="alert"
        className="mt-4 overflow-hidden rounded-md border border-destructive/40 bg-destructive/10 text-sm text-destructive"
      >
        <div className="flex items-start gap-2 p-3">
          <FontAwesomeIcon icon={faTriangleExclamation} className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">{t("login.error.heading")}</p>
            <p className="mt-0.5 text-xs opacity-80">{message}</p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

const PasswordField = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
  const { t } = useTranslation();
  const [isVisible, setVisible] = useState(false);
  const toggleVisible = useCallback(() => setVisible((visible) => !visible), []);

  return (
    <div>
      <label htmlFor="password" className="mb-1 block text-sm text-muted-foreground">
        {t("login.form.password")}
      </label>
      <div className="relative">
        <FontAwesomeIcon
          icon={faLock}
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          className="w-full rounded-md border border-input bg-background py-2.5 pl-9 pr-9 text-foreground focus-visible:outline focus-visible:outline-1 focus-visible:outline-ring"
          name="password"
          id="password"
          type={isVisible ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={t("login.form.password")}
          autoComplete="current-password"
          required
        />
        <button
          type="button"
          onClick={toggleVisible}
          aria-label={isVisible ? t("login.form.hidePassword") : t("login.form.showPassword")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <FontAwesomeIcon icon={isVisible ? faEyeSlash : faEye} className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export const LoginPage = () => {
  const { t } = useTranslation();
  const { isAuthenticated, signIn, signInGuest } = useAuth();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | undefined>();

  const router = useRouter();
  const search = Route.useSearch({});

  const handleSignIn = useCallback(
    async (e: { preventDefault: () => void }) => {
      e.preventDefault();
      setErrorMsg(undefined);
      setSubmitting(true);
      try {
        await signIn(user, password);
        router.navigate({ to: search.redirect });
      } catch (error) {
        setErrorMsg(getErrorMessage(error));
      } finally {
        setSubmitting(false);
      }
    },
    [signIn, user, password, router, search.redirect],
  );
  const handleGuestSignIn = useCallback(
    async (e: { preventDefault: () => void }) => {
      e.preventDefault();
      await signInGuest();
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
    <div className="w-full min-h-full flex items-center justify-center px-6 py-12">
      <motion.div
        initial={CARD_INITIAL}
        animate={CARD_ANIMATE}
        transition={CARD_TRANSITION}
        className="w-full max-w-sm"
      >
        <Link
          to="/home"
          aria-label={t("login.actions.backHome")}
          className="mb-6 flex w-fit items-center gap-2 text-brand"
        >
          <FontAwesomeIcon icon={faWallet} className="h-5 w-5" />
          <span className="text-sm font-medium tracking-wide">GnuCash Insights</span>
        </Link>

        <div className="rounded-xl border border-border bg-secondary p-6 shadow-xl sm:p-8">
          <h1 className="text-2xl font-semibold text-secondary-foreground">{t("login.heading")}</h1>
          <p className="mt-1 text-sm font-light text-muted-foreground">{t("login.subtitle")}</p>

          {errorMsg && <SignInError message={errorMsg} />}

          <form className="mt-6 space-y-4" onSubmit={handleSignIn}>
            <div>
              <label htmlFor="user" className="mb-1 block text-sm text-muted-foreground">
                {t("login.form.email")}
              </label>
              <div className="relative">
                <FontAwesomeIcon
                  icon={faEnvelope}
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  className="w-full rounded-md border border-input bg-background py-2.5 pl-9 pr-3 text-foreground focus-visible:outline focus-visible:outline-1 focus-visible:outline-ring"
                  name="user"
                  id="user"
                  type="text"
                  value={user}
                  onChange={handleUserChange}
                  placeholder={t("login.form.email")}
                  autoComplete="username"
                  required
                />
              </div>
            </div>
            <PasswordField value={password} onChange={handlePasswordChange} />

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-sky-500 py-2.5 font-medium text-shark-950 transition-colors hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("login.actions.signIn")}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase text-muted-foreground">{t("login.divider")}</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button"
            onClick={handleGuestSignIn}
            className="mt-6 w-full rounded-md border border-border py-2.5 font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t("login.actions.guest")}
          </button>
        </div>
      </motion.div>
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
