import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/useAuthContext";
import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export const AccountMenu = () => {
  const selected = useRouterState({ select: (state) => state.location.pathname });
  const redirect = useRouterState({ select: (state) => state.location.search.redirect });
  const { user, isAuthenticated, signOut } = useAuth();
  const firstLetter = user?.toUpperCase().substring(0, 1);
  const { t } = useTranslation();

  return (
    <div className="fixed top-4 right-4 z-50 cursor-pointer">
      {isAuthenticated() ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-8 w-8 rounded-full flex flex-col justify-center items-center bg-sky-300 text-black">
              {firstLetter}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => signOut()}>
              {t("accountMenu.logOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Link className="text-foreground" to="/login" search={{ redirect: redirect ?? selected }}>
          {t("accountMenu.logIn")}
        </Link>
      )}
    </div>
  );
};
