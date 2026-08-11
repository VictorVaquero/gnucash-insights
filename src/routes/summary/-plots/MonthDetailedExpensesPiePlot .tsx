import { BarLoader } from "@/components/ui/BarLoader";
import { DateTime } from "luxon";
import { useMemo } from "react";
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
import { parseNum, twStyles } from "@/common/utils.ts";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { useAuth } from "@/contexts/useAuthContext";
import { accountsOptions } from "@/db/queries/global";
import { netCostsYearMonthOptions } from "@/db/queries/summary";
import { Account } from "@/db/schema";
import { getConfig } from "@/db/utils";
import { useBook, useDB } from "@/hooks/useDB";
import { useQuery } from "@tanstack/react-query";
import { useSummaryPageContext } from "../-summaryPageContext";

interface Data {
  account: string | null;
  date: string;
  value: number;
  [key: string]: unknown;
}

const xf = (d: Data) => DateTime.fromISO(d.date);
const yf = (d: Data) => d.value;
const gf = (d: Data) => d.account ?? "";
const defaultAccount = "Others";
const gray = twStyles.getPropertyValue("--color-gray-400");

const nameOf = (d: Data, accounts: Account[]) =>
  accounts.find((a) => a.id === d.account)?.name ?? defaultAccount;
const colorOf = (d: Data, accounts: Account[]) => {
  const name = nameOf(d, accounts);
  return name !== defaultAccount ? getRandomColor(name) : getDefaultColor();
};

const ChartTooltipContent = ({
  payload,
  accounts,
}: Pick<TooltipContentProps<number, string>, "payload"> & { accounts: Account[] }) => {
  const d = payload[0].payload as Data;
  return (
    <div className="bg-popover text-popover-foreground border border-border rounded px-4 py-2 flex flex-col items-center">
      <span className="text-muted-foreground text-xs">{nameOf(d, accounts)}</span>
      <span className="text-muted-foreground text-xs">{d.date}</span>
      <span style={{ color: colorOf(d, accounts) }}>{parseNum(d.value)}</span>
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
  const filtered_data = useMemo(
    () =>
      props.data.filter((d) => xf(d).year === props.date.year && xf(d).month === props.date.month),
    [props.data, props.date],
  );
  const total = sum(filtered_data, yf);

  return (
    <div className="relative w-full h-64 md:h-full">
      <div className="absolute left-0 top-0 w-full h-full flex flex-col justify-center items-center pointer-events-none">
        <p className="text-muted-foreground">{props.date.toFormat("yyyy-MM")}</p>
        <p className="text-red-500">{parseNum(total)}</p>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <RechartsTooltip
            content={(p: TooltipContentProps<number, string>) => (
              <ChartTooltip {...p}>
                {({ payload }) => (
                  <ChartTooltipContent payload={payload} accounts={props.accounts} />
                )}
              </ChartTooltip>
            )}
          />
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
            {filtered_data.map((d) => (
              <Cell
                key={gf(d)}
                fill={
                  props.hideAccounts.includes(d.account ?? "") ? gray : colorOf(d, props.accounts)
                }
                onClick={() => props.setHideAccounts(d.account)}
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

  return (
    <DrawMonthDetailedExpensesPiePlot
      data={data}
      accounts={accounts}
      date={detailedDate}
      hideAccounts={hideAccounts}
      setHideAccounts={toggleHideAccount}
    />
  );
};
