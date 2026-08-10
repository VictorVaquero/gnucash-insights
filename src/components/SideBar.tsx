import { cn } from "@/lib/utils";
import {
  IconDefinition,
  faBook,
  faChartPie,
  faCoins,
  faMagnifyingGlass,
  faPiggyBank,
  faPlane,
  faWallet,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Link, createLink, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import React from "react";

interface NavItem {
  to: string;
  icon: IconDefinition;
  text: string;
  search?: Record<string, unknown>;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/home", icon: faWallet, text: "Home" },
  { to: "/metadata", icon: faBook, text: "Metadata" },
  { to: "/summary", icon: faChartPie, text: "Summary" },
  { to: "/expenses", icon: faCoins, text: "Expenses" },
  { to: "/travels", icon: faPlane, text: "Trips" },
  { to: "/investments", icon: faPiggyBank, text: "Investments" },
  {
    to: "/analysis",
    icon: faMagnifyingGlass,
    text: "Analysis",
    search: { query: {} },
  },
];

interface ItemLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  icon: IconDefinition;
  text: string;
  isCollapsed: boolean;
  isActive: boolean;
}

const ItemLinkComponent = React.forwardRef<HTMLAnchorElement, ItemLinkProps>(
  ({ icon, text, isCollapsed, isActive, className, ...props }, ref) => {
    return (
      <a
        ref={ref}
        {...props}
        className={cn(
          "group m-1 flex items-center rounded-md p-3 transition-all duration-200",
          "hover:bg-shark-800",
          isActive ? "bg-shark-800/50" : "transparent",
          className,
        )}
      >
        <FontAwesomeIcon
          icon={icon}
          className={cn(
            "h-5 w-5 shrink-0 transition-colors",
            isActive ? "text-sky-300" : "text-shark-300 group-hover:text-white",
          )}
        />
        {!isCollapsed ? (
          <span
            className={cn(
              "ms-3 overflow-hidden whitespace-nowrap transition-all duration-300",
              isCollapsed ? "max-w-0 opacity-0" : "max-w-xs opacity-100",
              isActive ? "text-sky-300 font-medium" : "text-shark-100 font-light",
            )}
          >
            {text}
          </span>
        ) : (
          <></>
        )}
      </a>
    );
  },
);

const CreatedLink = createLink(ItemLinkComponent);

const NavList = ({ isCollapsed }: { isCollapsed: boolean }) => {
  const currentHref = useRouterState({ select: (s) => s.location.href });

  return (
    <nav className="flex-1 px-2 py-4">
      <ul className="space-y-1">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <CreatedLink
              to={item.to}
              search={item.search}
              icon={item.icon}
              text={item.text}
              isCollapsed={isCollapsed}
              isActive={currentHref.startsWith(item.to)}
              preload="render"
            />
          </li>
        ))}
      </ul>
    </nav>
  );
};

const MenuIcon = ({ isOpen }: { isOpen: boolean }) => {
  const bar =
    "absolute left-0 h-0.5 w-6 rounded-full bg-current transition-all duration-300 ease-in-out";
  return (
    <span className="relative block h-5 w-6">
      <span className={cn(bar, isOpen ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0")} />
      <span className={cn(bar, "top-1/2 -translate-y-1/2", isOpen ? "opacity-0" : "opacity-100")} />
      <span className={cn(bar, isOpen ? "top-1/2 -translate-y-1/2 -rotate-45" : "top-[18px]")} />
    </span>
  );
};

export const SideBar = ({
  isCollapsed,
  toggleSidebar,
}: {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}) => {
  return (
    <>
      {/* Backdrop: dims the rest of the page while the nav is expanded, on every viewport */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}

      {/* Single nav panel: always fixed, only its width animates, so it never affects document flow */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col overflow-hidden bg-shark-900 transition-[width] duration-300 ease-in-out",
          isCollapsed ? "w-14" : "w-64",
        )}
      >
        <div className="flex items-center gap-2.5 p-3">
          <Link to="/home" className="flex shrink-0 items-center gap-2.5 rounded" aria-label="Home">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-400/10">
              <FontAwesomeIcon icon={faWallet} className="h-4 w-4 text-sky-400" />
            </span>
            <AnimatePresence mode="sync">
              {isCollapsed ? (
                <></>
              ) : (
                <motion.span
                  className="overflow-hidden whitespace-nowrap text-lg font-semibold text-white"
                  key="cashpy-wordmark"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "auto", opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.15, delay: 0, ease: "easeInOut" }}
                >
                  CashPy
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>

        <div className="px-2">
          <button
            onClick={toggleSidebar}
            aria-label={isCollapsed ? "Open menu" : "Close menu"}
            aria-expanded={!isCollapsed}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-shark-200 transition-colors hover:bg-shark-800 hover:text-white"
          >
            <MenuIcon isOpen={!isCollapsed} />
          </button>
        </div>

        <NavList isCollapsed={isCollapsed} />
      </aside>
    </>
  );
};
