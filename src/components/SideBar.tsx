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
import { createLink, useRouterState } from "@tanstack/react-router";
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
          className
        )}
      >
        <FontAwesomeIcon
          icon={icon}
          className={cn(
            "h-5 w-5 shrink-0 transition-colors",
            isActive ? "text-sky-300" : "text-shark-300 group-hover:text-white"
          )}
        />
        {!isCollapsed ? (
          <span
            className={cn(
              "ms-3 overflow-hidden whitespace-nowrap transition-all duration-300",
              isCollapsed ? "max-w-0 opacity-0" : "max-w-xs opacity-100",
              isActive
                ? "text-sky-300 font-medium"
                : "text-shark-100 font-light"
            )}
          >
            {text}
          </span>
        ) : (
          <></>
        )}
      </a>
    );
  }
);

const CreatedLink = createLink(ItemLinkComponent);

export const SideBar = ({
  isCollapsed,
  toggleSidebar,
}: {
  isCollapsed: boolean;
  toggleSidebar?: () => void;
}) => {
  const currentHref = useRouterState({ select: (s) => s.location.href });

  return (
    <>
      {/* 1. MOBILE OVERLAY: Only visible on mobile when sidebar is NOT collapsed */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}

      {/* 2. SIDEBAR CONTAINER */}
      <aside
        className={cn(
          "fixed md:static inset-y-0 left-0 z-50 flex flex-col bg-shark-900  transition-all duration-300 ease-in-out",
          isCollapsed ? "w-14" : "w-64",
          isCollapsed ? "-translate-x-full md:translate-x-0" : "translate-x-0"
        )}
      >
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
      </aside>
    </>
  );
};
