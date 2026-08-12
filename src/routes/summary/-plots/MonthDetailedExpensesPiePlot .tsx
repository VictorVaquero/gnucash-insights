import { BarLoader } from "@/components/ui/BarLoader";
import { DateTime } from "luxon";
import { useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  TooltipContentProps,
} from "recharts";

import { sum } from "@/common/aggregate";
import { getDefaultColor, getRandomColor } from "@/common/getColors";
import { formatCurrency, twStyles } from "@/common/utils.ts";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { useAuth } from "@/contexts/useAuthContext";
import { accountsOptions } from "@/db/queries/global";
import { netCostsYearMonthOptions } from "@/db/queries/summary";
import { Account } from "@/db/schema";
import { getConfig } from "@/db/utils";
import { useBook, useDB } from "@/hooks/useDB";
import { useChartScrubber } from "@/hooks/useChartScrubber";
import { useLocale } from "@/hooks/useLocale";
import { useQuery } from "@tanstack/react-query";
import { useSummaryPageContext } from "../-summaryPageContext";
import { useDeflator } from "../-useDeflator";

interface Data {
  account: string | null;
  date: string;
  value: number;
  [key: string]: unknown;
}

const xf = (d: Data) => DateTime.fromISO(d.date);
const yf = (d: Data) => d.value;
const gf = (d: Data) => d.account ?? "";
const gray = twStyles.getPropertyValue("--color-gray-400");

const nameOf = (d: Data, accounts: Account[], defaultAccount: string) =>
  accounts.find((a) => a.id === d.account)?.name ?? defaultAccount;
const colorOf = (d: Data, accounts: Account[], defaultAccount: string) => {
  const name = nameOf(d, accounts, defaultAccount);
  return name !== defaultAccount ? getRandomColor(name) : getDefaultColor();
};

// `colorOf` returns a stable string per account, so a small cache keeps the resulting
// style object referentially stable across renders for the same color.
const colorStyleCache = new Map<string, { color: string }>();
const colorStyle = (color: string) => {
  let style = colorStyleCache.get(color);
  if (!style) {
    style = { color };
    colorStyleCache.set(color, style);
  }
  return style;
};

const ChartTooltipContent = ({
  payload,
  accounts,
  defaultAccount,
}: Pick<TooltipContentProps<number, string>, "payload"> & {
  accounts: Account[];
  defaultAccount: string;
}) => {
  const d = payload[0].payload as Data;
  const { locale } = useLocale();
  return (
    <div className="bg-popover text-popover-foreground border border-border rounded px-4 py-2 flex flex-col items-center">
      <span className="text-muted-foreground text-xs">{nameOf(d, accounts, defaultAccount)}</span>
      <span className="text-muted-foreground text-xs">{d.date}</span>
      <span style={colorStyle(colorOf(d, accounts, defaultAccount))}>
        {formatCurrency(d.value, locale, { compact: true })}
      </span>
    </div>
  );
};

const DrawMonthDetailedExpensesPiePlot = (props: {
  data: Data[];
  accounts: Account[];
  date: DateTime;
  hideAccounts: string[];
  setHideAccounts: CallableFunction;
}) => {
  const { locale } = useLocale();
  const { t } = useTranslation();
  const defaultAccount = t("summary.plots.others");
  const filtered_data = useMemo(
    () =>
      props.data.filter((d) => xf(d).year === props.date.year && xf(d).month === props.date.month),
    [props.data, props.date],
  );
  const total = sum(filtered_data, yf);

  // Pie charts have no linear x-axis to drag along, so the scrubber here maps a
  // horizontal drag position to segment *index* (in draw order) instead of a data
  // point in space -- cycling through wedges left-to-right rather than tracking a
  // literal cursor position, per chart-component-contract.md's non-goal on
  // pixel-identical scrubbing behavior across chart types.
  const containerRef = useRef<HTMLDivElement>(null);
  const { activeIndex } = useChartScrubber(containerRef, { length: filtered_data.length });
  const scrubbed = activeIndex != null ? filtered_data[activeIndex] : undefined;

  const { setHideAccounts } = props;
  const renderTooltipContent = useCallback(
    (p: TooltipContentProps<number, string>) => (
      <ChartTooltip {...p}>
        {({ payload }) => (
          <ChartTooltipContent
            payload={payload}
            accounts={props.accounts}
            defaultAccount={defaultAccount}
          />
        )}
      </ChartTooltip>
    ),
    [props.accounts, defaultAccount],
  );

  const hideAccountHandlers = useMemo(
    () => new Map(filtered_data.map((d) => [d.account, () => setHideAccounts(d.account)])),
    [filtered_data, setHideAccounts],
  );

  return (
    <div ref={containerRef} className="relative w-full h-64 md:h-full touch-none">
      <div className="absolute left-0 top-0 w-full h-full flex flex-col justify-center items-center pointer-events-none">
        {scrubbed ? (
          <>
            <p className="text-muted-foreground">
              {nameOf(scrubbed, props.accounts, defaultAccount)}
            </p>
            <p style={colorStyle(colorOf(scrubbed, props.accounts, defaultAccount))}>
              {formatCurrency(scrubbed.value, locale, { compact: true })}
            </p>
          </>
        ) : (
          <>
            <p className="text-muted-foreground">
              {props.date.setLocale(locale).toFormat("yyyy-MM")}
            </p>
            <p className="text-red-500">{formatCurrency(total, locale, { compact: true })}</p>
          </>
        )}
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <RechartsTooltip content={renderTooltipContent} />
          <Pie
            data={filtered_data}
            dataKey="value"
            nameKey="account"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={2}
            stroke="white"
            strokeWidth={1.5}
            isAnimationActive={false}
            className="cursor-pointer"
          >
            {filtered_data.map((d, i) => (
              <Cell
                key={gf(d)}
                fill={
                  props.hideAccounts.includes(d.account ?? "")
                    ? gray
                    : colorOf(d, props.accounts, defaultAccount)
                }
                stroke={i === activeIndex ? "var(--color-foreground)" : "white"}
                strokeWidth={i === activeIndex ? 3 : 1.5}
                onClick={hideAccountHandlers.get(d.account)}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const MonthDetailedExpensesPiePlot = () => {
  const { db } = useDB();
  const { bookId } = useBook();
  const { user } = useAuth();
  const { hideAccounts, toggleHideAccount, detailedDate } = useSummaryPageContext();
  const { deflate } = useDeflator();

  const dbconf = getConfig(user);
  const { data: accounts, isSuccess: isSuccessAccounts } = useQuery(
    accountsOptions({ db, bookId, accountIds: [dbconf.expenses] }),
  );
  const { data, isSuccess } = useQuery(netCostsYearMonthOptions({ db, user, bookId }));

  if (!isSuccessAccounts || !isSuccess)
    return (
      <div className="w-full h-full flex flex-row items-center justify-center">
        {" "}
        <BarLoader />{" "}
      </div>
    );

  const deflatedData = data.map((d) => ({ ...d, value: deflate(d.value, d.date) }));

  return (
    <DrawMonthDetailedExpensesPiePlot
      data={deflatedData}
      accounts={accounts}
      date={detailedDate}
      hideAccounts={hideAccounts}
      setHideAccounts={toggleHideAccount}
    />
  );
};
