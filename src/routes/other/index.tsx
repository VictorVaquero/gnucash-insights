import { useOutletContext } from "react-router-dom";

import { RootContext } from "@/routes/Root";
import { TransactTable } from "./TransactsTable"
import { StateHandler } from "@/components/StateHandler";
import { useFullTransactions } from "@/querys/apiQueryFunctions";
import { useState } from "react";
import { FullTransaction } from "@/querys/entities";
import { TransactsPlot } from "./TransactsPlot";

export const Other = () => {
    const {bookId} = useOutletContext<RootContext>();
    const transactions = useFullTransactions(bookId);
    const [filteredTransactions, setFilteredTransactions] = useState<FullTransaction[]>([]) 

    return <div className="w-full h-full p-10 flex flex-col">
        <StateHandler dependencies={[transactions]}>
            {filteredTransactions.length !== 0 ? <TransactsPlot data={filteredTransactions!}/> : <div className="h-1/2"></div>}
        </StateHandler>
        <StateHandler dependencies={[transactions]}>
            <TransactTable data={transactions.data!} setFilteredData={setFilteredTransactions}/>
        </StateHandler>
    </div> 
}