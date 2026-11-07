import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { BarLoader } from "@/components/ui/BarLoader";
import { useAuth } from "@/contexts/useAuthContext";
import { accountsOptions } from "@/db/queries/global";
import { registerSplitsOptions } from "@/db/queries/register";
import { getConfig } from "@/db/utils";
import { useBook, useDB } from "@/hooks/useDB";
import { RegisterTabs } from "./-RegisterTabs";

interface RegisterSearch {
  account?: string;
  /** Comma-separated ids of the open tabs. */
  tabs?: string;
  /** JSON of the active tab's non-default view state (mode, filters, dates, sort). */
  view?: string;
}

const Register = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { db } = useDB();
  const { bookId } = useBook();
  const dbconf = getConfig(user);
  const { account, tabs: tabsParam, view } = Route.useSearch();
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
  const known = new Set(accounts.map((a) => a.id));
  const fallback = withSplits.has(dbconf.checking)
    ? dbconf.checking
    : (accounts.find((a) => withSplits.has(a.id))?.id ?? "");
  const requested = (tabsParam ?? "").split(",").filter((id) => known.has(id));
  const active = account && known.has(account) ? account : (requested[0] ?? fallback);
  const tabs = requested.includes(active) ? requested : [...requested, active];

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <h1 className="text-xl font-semibold">{t("register.title")}</h1>
      <RegisterTabs
        splits={splits}
        accounts={accounts}
        tabs={tabs}
        active={active}
        view={view}
        onView={(next) =>
          void navigate({
            search: (prev) => ({ ...prev, view: next }),
            replace: true,
          })
        }
        onTabs={(next, current) =>
          void navigate({
            search: {
              account: current,
              tabs: next.length > 1 ? next.join(",") : undefined,
              view: current === active ? view : undefined,
            },
            replace: true,
          })
        }
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
    tabs: typeof search.tabs === "string" ? search.tabs : undefined,
    view: typeof search.view === "string" ? search.view : undefined,
  }),
});
