export interface File {
    account: string,
    datetime: string,
    entities: string[],
    full: string,
    has_summary: boolean,
    is_valid: boolean,
    name: string,
    summary_dir: string,
    type: "gnca"
}

export interface Book {
    book: string,
    number_of_commodities: number,
    number_of_accounts: number,
    number_of_transactions: number,
    first_transaction: string,
    last_transaction: string,
    url: string
}

export interface Account {
    account: string,
    name: string,
    type: string,
    description?: string,
    parent?: string,
    commodity?: string,
    url: string
}

export interface AccountEnriched extends Account {
    color: string;
    active: boolean;
}

export interface Transaction {
    transaction: string,
    description?: string,
    notes?: string,
    posted: string,
    created: string
}

export interface Split {
    split: string,
    is_reconciled: boolean,
    value: number,
    account: string
}

export interface FullTransaction extends Transaction, Split {
    type: string,
    name: string
}

export interface View {
}

export interface Kpi extends View {
    kpi: string,
    value: number
}

export interface Closure extends View {
    parent: string,
    child: string,
    depth: number
}

export interface AccountsHiearchy extends View {
    name: string,
    full_name: string,
    children?: AccountsHiearchy[]
}

export interface NetCostsYearMonth extends View {
    account: string,
    yearmonth: string,
    value: number
}

export interface IncomeExpenses extends View {
    name: 'Ingresos' | 'Gastos',
    posted: string,
    yearmonth: string,
    value: number
}

export interface ProfitLoss extends View {
    name: 'Ganancia' | 'Perdida',
    yearmonth: string,
    value: number
}

export interface AssetsDebts extends View {
    name: string,
    base: string,
    posted: string,
    yearmonth: string,
    value: number
}

const i = 'idle'; const e = 'error'; const l = 'loading'; const s = 'success';
export type Status = typeof i | typeof e | typeof l | typeof s