import {useQuery} from "react-query";
import {
    Account,
    AccountsHiearchy,
    AssetsDebts,
    Book,
    Closure,
    File,
    FullTransaction,
    IncomeExpenses,
    Kpi,
    NetCostsYearMonth,
    ProfitLoss,
    Status,
} from "@/querys/entities";

async function fetchUrl(url: string) {
    console.log("START - Feching ", url);
    const response = await fetch('http://localhost:5000'+url, {method: 'GET', mode: 'cors', credentials: 'include'});
    if (!response.ok) {
        console.error('END - Feching with error ', url)
        throw new Error('Network response was not ok')
    }
    //console.debug('RESPONSE - ', url, response);
    const data = response.json();
    data.then(()=>{
        console.debug("Url: ", url, " Data:", data);
        console.log("END - Feching ", url);
    });
    return data;
}
export function useUrl<Type>(url: string, enabled: boolean = true): {status: Status, data: Type[] | undefined, error: Error | unknown} {
    const { status, data, error } = useQuery([url], () => fetchUrl(url), {enabled: enabled});
    return { status: status, data: data, error: error }
}

export function useView<Type>(bookId: string|undefined, viewUrl: string): {status: Status, data: Type[] | undefined, error: Error | unknown} {
    return useUrl<Type>('/api/v1/data/books/' + bookId + '/view/' + viewUrl, !!bookId)
}


export function useFiles() {return useUrl<File>('/api/v1/files/cashfiles')}
export function useBooks() {return useUrl<Book>('/api/v1/data/books')}
export function useAccounts(bookId: string|undefined) {return useUrl<Account>('/api/v1/data/books/'+bookId+'/accounts', !!bookId)}

export function useNetCostsYearMonth(bookId: string | undefined) { return useView<NetCostsYearMonth>(bookId, 'NetCostsDetailsSummaryByYearMonth'); }
export function useProfitLoss(bookId: string | undefined)  { return useView<ProfitLoss>(bookId, 'ProfitLossSummaryByYearMonth'); }
export function useIncomeExpenses(bookId: string | undefined) { return useView<IncomeExpenses>(bookId, 'IncomeAndExpenses'); }
export function useAssetsDebts(bookId: string | undefined) { return useView<AssetsDebts>(bookId, 'AssetsAndDebts'); }
export function useKpis(bookId: string | undefined) { return useView<Kpi>(bookId, 'Kpis'); }
export function useSavings(bookId: string | undefined) { return useView<Kpi>(bookId, 'KpiSavings'); }
export function useClosure(bookId: string | undefined) { return useView<Closure>(bookId, 'AccountsClosure'); }
export function useHiearachy(bookId: string | undefined)  { return useView<AccountsHiearchy>(bookId, 'AccountsHierarchy'); }
export function useFullTransactions(bookId: string | undefined)  { return useView<FullTransaction>(bookId, 'FullTransactions'); }