import { useOutletContext } from "react-router-dom";

import { RootContext } from "@/routes/Root";
import { TransactTable } from "./TransactsTable"
import { StateHandler } from "@/components/StateHandler";
import { useFullTransactions } from "@/querys/apiQueryFunctions";
import { useState } from "react";
import { FullTransaction } from "@/querys/entities";
import { TransactsPlot } from "./TransactsPlot";
import { KpiBlock } from "./KpiBlock";

export const Other = () => {
    const { bookId } = useOutletContext<RootContext>();
    const transactions = useFullTransactions(bookId);
    const [filteredTransactions, setFilteredTransactions] = useState<FullTransaction[]>([])

    return <div className="
        w-full h-full p-10
        grid grid-cols-[1fr_max-content] grid-rows-2
        gap-x-6 gap-y-6
        ">
        <div className="row-start-1 row-end-1">
            <StateHandler dependencies={[transactions]}>
                {filteredTransactions.length !== 0 ? <TransactsPlot data={filteredTransactions!} /> : <div className="h-1/2"></div>}
            </StateHandler>
        </div>
        <div className="row-start-1 col-start-2">
            <KpiBlock data={filteredTransactions} />
        </div>
        <div className='row-start-2 col-span-2'>
            <StateHandler dependencies={[transactions]}>
                <TransactTable data={transactions.data!} setFilteredData={setFilteredTransactions} />
            </StateHandler>
        </div>
    </div>
}