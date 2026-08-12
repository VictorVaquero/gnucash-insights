import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { faBolt, faChartPie, faLock, faWallet } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { motion } from "motion/react";
import { useCallback } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/contexts/useAuthContext";

const PREVIEW_STATS = [
  { nameKey: "home.preview.stats.net", value: "4,231 €", color: "text-foreground" },
  { nameKey: "home.preview.stats.income", value: "2,845 €", color: "text-green-500" },
  { nameKey: "home.preview.stats.expenses", value: "1,120 €", color: "text-red-500" },
  { nameKey: "home.preview.stats.assets", value: "18,940 €", color: "text-foreground" },
];

const PREVIEW_TREND = [
  { month: "Feb", value: 12400 },
  { month: "Mar", value: 13100 },
  { month: "Apr", value: 12800 },
  { month: "May", value: 14600 },
  { month: "Jun", value: 15900 },
  { month: "Jul", value: 15200 },
  { month: "Aug", value: 17400 },
];

const FEATURES = [
  { icon: faBolt, textKey: "home.features.liveSync" },
  { icon: faLock, textKey: "home.features.localIngestion" },
  { icon: faChartPie, textKey: "home.features.richCharts" },
];

const MOTION_INITIAL = { opacity: 0, y: 12 };
const MOTION_ANIMATE = { opacity: 1, y: 0 };
const PREVIEW_TRANSITION = { duration: 0.5, delay: 0.15, ease: "easeOut" };
const HERO_TRANSITION = { duration: 0.5, ease: "easeOut" };
const AREA_CHART_MARGIN = { top: 8, right: 8, bottom: 0, left: 0 };
const AREA_TOOLTIP_CONTENT_STYLE = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 6,
};
const AREA_TOOLTIP_LABEL_STYLE = { color: "var(--color-popover-foreground)" };
const AREA_TOOLTIP_ITEM_STYLE = { color: "var(--color-popover-foreground)" };
const LOGIN_SEARCH = { redirect: "/summary" };

const PreviewPanel = () => {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={MOTION_INITIAL}
      animate={MOTION_ANIMATE}
      transition={PREVIEW_TRANSITION}
      className="w-full max-w-md rounded-xl border border-border bg-secondary p-5 shadow-xl"
    >
      <div className="flex items-center justify-between px-1">
        <span className="text-sm text-muted-foreground font-light">{t("home.preview.label")}</span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          {t("home.preview.sampleData")}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {PREVIEW_STATS.map((stat) => (
          <div key={stat.nameKey} className="rounded-md bg-background p-3">
            <span className="block text-xs text-muted-foreground">{t(stat.nameKey)}</span>
            <span className={"text-lg " + stat.color}>{stat.value}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 h-28 rounded-md bg-background p-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={PREVIEW_TREND} margin={AREA_CHART_MARGIN}>
            <defs>
              <linearGradient id="previewTrendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" hide />
            <Tooltip
              contentStyle={AREA_TOOLTIP_CONTENT_STYLE}
              labelStyle={AREA_TOOLTIP_LABEL_STYLE}
              itemStyle={AREA_TOOLTIP_ITEM_STYLE}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--color-brand)"
              strokeWidth={2}
              fill="url(#previewTrendFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

const Home = () => {
  const { t } = useTranslation();
  const { signInGuest } = useAuth();
  const router = useRouter();

  const handleGuestSignIn = useCallback(async () => {
    await signInGuest();
    router.navigate({ to: "/summary" });
  }, [signInGuest, router]);

  return (
    <div className="w-full min-h-full flex items-center justify-center px-6 sm:px-10 py-12">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-6 items-center">
        <motion.div initial={MOTION_INITIAL} animate={MOTION_ANIMATE} transition={HERO_TRANSITION}>
          <div className="flex items-center gap-2 text-brand">
            <FontAwesomeIcon icon={faWallet} className="h-5 w-5" />
            <span className="text-sm font-medium tracking-wide">CashPy</span>
          </div>

          <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
            {t("home.hero.titleLine1")}
            <br />
            {t("home.hero.titleLine2")}
          </h1>

          <p className="mt-5 text-lg text-foreground font-light max-w-md">
            {t("home.hero.subtitle")}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={handleGuestSignIn}
              className="px-5 py-3 rounded-md bg-sky-500 hover:bg-sky-400 text-shark-950 font-medium transition-colors"
            >
              {t("home.actions.tryGuest")}
            </button>
            <Link
              to="/login"
              search={LOGIN_SEARCH}
              className="px-5 py-3 rounded-md border border-border text-foreground hover:bg-accent font-medium transition-colors"
            >
              {t("home.actions.signIn")}
            </Link>
          </div>

          <ul className="mt-10 space-y-3">
            {FEATURES.map((feature) => (
              <li
                key={feature.textKey}
                className="flex items-center gap-3 text-foreground font-light"
              >
                <FontAwesomeIcon icon={feature.icon} className="h-4 w-4 text-brand shrink-0" />
                <span>{t(feature.textKey)}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        <div className="flex justify-center md:justify-end">
          <PreviewPanel />
        </div>
      </div>
    </div>
  );
};

export const Route = createFileRoute("/home")({
  component: Home,
  beforeLoad: async () => {
    return { title: "routes.home.title" };
  },
});
