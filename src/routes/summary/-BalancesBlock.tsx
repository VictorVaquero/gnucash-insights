import { useQuery } from "@tanstack/react-query";

import { parseNum } from "@/common/utils.ts";
import { KpiRow } from "@/components/KpiRow.tsx";
import { useAuth } from "@/contexts/useAuthContext";
import { splitSumOptions } from "@/db/queries/global";
import { getConfig } from "@/db/utils";
import { useBook, useDB } from "@/hooks/useDB";
import { cn } from "@/lib/utils";

export const BalancesBlock = (props: { className?: string }) => {
  const { db } = useDB();
  const { bookId } = useBook();
  const { user } = useAuth();
  const dbconf = getConfig(user);

  const { data: checking } = useQuery(splitSumOptions(db, bookId, [dbconf.checking]));
  const { data: savings } = useQuery(splitSumOptions(db, bookId, [dbconf.savings]));
  const { data: assets } = useQuery(splitSumOptions(db, bookId, [dbconf.assets]));
  const { data: investments } = useQuery(splitSumOptions(db, bookId, [dbconf.investments]));
  const { data: taxes } = useQuery(splitSumOptions(db, bookId, [dbconf.taxes]));

  return (
    <div className={cn(props.className)}>
      <p className="text-xs font-medium text-muted-foreground mb-1">Accounts</p>
      <section className="flex flex-col">
        <KpiRow name="Assets" value={parseNum(assets ?? 0)} />
        <KpiRow name="Checking" value={parseNum(checking ?? 0)} />
        <KpiRow name="Savings" value={parseNum(savings ?? 0)} />
        <KpiRow name="Investment" value={parseNum(investments ?? 0)} />
        <KpiRow name="Taxes" value={parseNum(taxes ?? 0)} color="text-red-600" />
      </section>
    </div>
  );
};
