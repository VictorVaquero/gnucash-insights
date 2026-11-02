import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import {
  IconDefinition,
  faBook,
  faChartPie,
  faCoins,
  faMagnifyingGlass,
  faPiggyBank,
  faPlane,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { createLink, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import React from "react";
import { useTranslation } from "react-i18next";

interface NavItem {
  to: string;
  icon: IconDefinition;
  labelKey: string;
  search?: Record<string, unknown>;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/metadata", icon: faBook, labelKey: "nav.metadata" },
  { to: "/summary", icon: faChartPie, labelKey: "nav.summary" },
  { to: "/expenses", icon: faCoins, labelKey: "nav.expenses" },
  { to: "/travels", icon: faPlane, labelKey: "nav.trips" },
  { to: "/investments", icon: faPiggyBank, labelKey: "nav.investments" },
  {
    to: "/analysis",
    icon: faMagnifyingGlass,
    labelKey: "nav.analysis",
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
        aria-label={isCollapsed ? text : undefined}
        className={cn(
          "group m-1 flex items-center justify-center rounded-md p-3 transition-all duration-200",
          !isCollapsed && "justify-start",
          "hover:bg-accent",
          isActive ? "bg-accent" : "transparent",
          className,
        )}
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
          <FontAwesomeIcon
            icon={icon}
            className={cn(
              "h-5 w-5 transition-colors",
              isActive ? "text-brand" : "text-secondary-foreground",
            )}
          />
        </span>
        {!isCollapsed ? (
          <span
            className={cn(
              "ms-3 overflow-hidden whitespace-nowrap transition-all duration-300",
              isCollapsed ? "max-w-0 opacity-0" : "max-w-xs opacity-100",
              isActive ? "text-brand font-medium" : "text-secondary-foreground font-light",
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
  const { t } = useTranslation();

  return (
    <nav className="flex-1 px-2 py-4">
      <ul className="space-y-1">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <CreatedLink
              to={item.to}
              search={item.search}
              icon={item.icon}
              text={t(item.labelKey)}
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

const wordmarkInitial = { width: 0, opacity: 0 };
const wordmarkAnimate = { width: "auto", opacity: 1 };
const wordmarkExit = { width: 0, opacity: 0 };
const wordmarkTransition = { duration: 0.15, delay: 0, ease: "easeInOut" as const };

const MenuIcon = ({ isOpen }: { isOpen: boolean }) => {
  const bar =
    "absolute left-0 h-0.5 w-6 rounded-full bg-current transition-all duration-300 ease-in-out";
  return (
    <span className="relative block h-5 w-6">
      <span className={cn(bar, isOpen ? "top-[6px] rotate-45" : "top-0")} />
      <span className={cn(bar, "top-1/2 -translate-y-1/2", isOpen ? "opacity-0" : "opacity-100")} />
      <span className={cn(bar, isOpen ? "top-[10px] -rotate-45" : "top-[18px]")} />
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
  const { t } = useTranslation();
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
          "fixed inset-y-0 left-0 z-50 flex flex-col overflow-hidden border-r border-border bg-secondary transition-[width] duration-300 ease-in-out",
          isCollapsed ? "w-14" : "w-64",
        )}
      >
        <div className="flex items-center gap-2.5 p-3">
          <button
            onClick={toggleSidebar}
            aria-label={isCollapsed ? t("sidebar.openMenu") : t("sidebar.closeMenu")}
            aria-expanded={!isCollapsed}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-secondary-foreground transition-colors hover:bg-accent"
          >
            <MenuIcon isOpen={!isCollapsed} />
          </button>
          <AnimatePresence mode="sync">
            {isCollapsed ? (
              <></>
            ) : (
              <motion.span
                className="overflow-hidden whitespace-nowrap text-lg font-semibold text-secondary-foreground"
                key="gnucash-insights-wordmark"
                initial={wordmarkInitial}
                animate={wordmarkAnimate}
                exit={wordmarkExit}
                transition={wordmarkTransition}
              >
                GnuCash Insights
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <NavList isCollapsed={isCollapsed} />

        <div
          className={cn(
            "flex border-t border-border p-2",
            isCollapsed ? "flex-col gap-1" : "gap-1",
          )}
        >
          <ThemeToggle isCollapsed={isCollapsed} />
          <LanguageSwitcher isCollapsed={isCollapsed} />
        </div>
      </aside>
    </>
  );
};
