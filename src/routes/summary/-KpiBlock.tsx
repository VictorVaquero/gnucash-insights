import { useQuery } from "@tanstack/react-query";

import { parseNum } from "@/common/utils.ts";
import { KpiCard } from "@/components/KpiCard.tsx";
import { useAuth } from "@/contexts/useAuthContext";
import { fullTransactionsQuery, splitSumOptions } from '@/db/queries/global';
import { getConfig } from "@/db/utils";
import { useBook, useDB } from "@/hooks/useDB";

export const KpiBlock = (props: { className: string }) => {
    const { db } = useDB();
    const { bookId } = useBook();
    const { user } = useAuth()
    const dbconf = getConfig(user)

    const { data: netGain } = useQuery(splitSumOptions(db, bookId, [dbconf.expenses, dbconf.income]))
    const { data: earnings } = useQuery(splitSumOptions(db, bookId, [dbconf.income, dbconf.taxes]))
    const { data: costs } = useQuery(splitSumOptions(db, bookId, [dbconf.expenses]))
    const { data: checking } = useQuery(splitSumOptions(db, bookId, [dbconf.checking]))
    const { data: savings } = useQuery(splitSumOptions(db, bookId, [dbconf.savings]))
    const { data: assets } = useQuery(splitSumOptions(db, bookId, [dbconf.assets]))
    const { data: investments } = useQuery(splitSumOptions(db, bookId, [dbconf.investments]))
    const { data: taxes } = useQuery(splitSumOptions(db, bookId, [dbconf.taxes]))

    if (db) console.log(db.select().from(fullTransactionsQuery(db)).execute())

    return <section className={'grid grid-cols-2 md:grid-cols-3 grid-rows-[min-content_min-content_min-content] gap-x-2 gap-y-2' + (props.className ? ' ' + props.className : '')}>
        <KpiCard name="Net" value={parseNum(netGain ?? 0)} />
        <KpiCard name="Income" value={parseNum(earnings ?? 0)} color='text-green-600' />
        <KpiCard name="Expenses" value={parseNum((costs ?? 0)-(taxes??0))} color='text-red-600' />
        <KpiCard name="Assets" value={parseNum(assets ?? 0)} />
        <KpiCard name="Checking" value={parseNum(checking ?? 0)} />
        <KpiCard name="Savings" value={parseNum(savings ?? 0)} />
        <KpiCard name="Investment" value={parseNum(investments ?? 0)} />
    </section>
}