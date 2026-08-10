import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/useAuthContext";
import { Link, useRouterState } from "@tanstack/react-router";

export const AccountMenu = () => {
  const selected = useRouterState({ select: (state) => state.location.pathname });
  const redirect = useRouterState({ select: (state) => state.location.search.redirect });
  const { user, isAuthenticated, signOut } = useAuth();
  const firstLetter = user?.toUpperCase().substring(0, 1);

  return (
    <div className="fixed top-4 right-4 z-50 cursor-pointer">
      {isAuthenticated() ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-8 w-8 rounded-full flex flex-col justify-center items-center bg-sky-300 text-black">
              {firstLetter}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-shark-600 border-shark-600 text-white">
            <DropdownMenuItem onSelect={() => signOut()}>Log Out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Link className="text-white" to="/login" search={{ redirect: redirect ?? selected }}>
          Log In
        </Link>
      )}
    </div>
  );
};
