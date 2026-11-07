import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { BarLoader } from "@/components/ui/BarLoader";
import { useAuth } from "@/contexts/useAuthContext";
import { accountsOptions } from "@/db/queries/global";
import { registerSplitsOptions } from "@/db/queries/register";
import { getConfig } from "@/db/utils";
import { useBook, useDB } from "@/hooks/useDB";
import { RegisterView } from "./-RegisterView";

interface RegisterSearch {
  account?: string;
}

const Register = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { db } = useDB();
  const { bookId } = useBook();
  const dbconf = getConfig(user);
  const { account } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data: splits } = useQuery(registerSplitsOptions(db, bookId));
  const { data: accounts } = useQuery(accountsOptions({ db, bookId }));

  if (!splits || !accounts)
    return (
      <div className="w-full h-full flex flex-row items-center justify-center">
        <BarLoader />
      </div>
    );

  // Default to the checking account, or the first account that has any transactions.
  const withSplits = new Set(splits.map((s) => s.accountId));
  const accountId =
    account && accounts.some((a) => a.id === account)
      ? account
      : withSplits.has(dbconf.checking)
        ? dbconf.checking
        : (accounts.find((a) => withSplits.has(a.id))?.id ?? "");

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <h1 className="text-xl font-semibold">{t("register.title")}</h1>
      <RegisterView
        splits={splits}
        accounts={accounts}
        accountId={accountId}
        onAccountChange={(id) => void navigate({ search: { account: id }, replace: true })}
      />
    </div>
  );
};

export const Route = createFileRoute("/register/")({
  component: Register,
  beforeLoad: async ({ location, context: { auth } }) => {
    if (auth && !auth.isAuthenticated()) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    return { title: "routes.register.title" };
  },
  validateSearch: (search: Record<string, unknown>): RegisterSearch => ({
    account: typeof search.account === "string" ? search.account : undefined,
  }),
});
