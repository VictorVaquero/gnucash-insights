import { getRouteApi } from "@tanstack/react-router"
import { Column, ColumnFiltersState, Table, createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type PaginationState } from "@tanstack/react-table"
import { DateTime } from "luxon"
import { useCallback, useEffect, useMemo, useState } from "react"

import { Checkbox } from "@/components/Checkbox"
import { FullTransaction as Data } from ".."

const deserialize = (searchParams: Record<string, unknown>): ColumnFiltersState => {
    return Object.entries(searchParams).map(([k, v]) => ({ 'id': k, 'value': v }));
}
const serialize = (filters: ColumnFiltersState): Record<string, string> => {
    return Object.fromEntries(filters.map(x => [String(x.id), String(x.value)]));
}

const useColumnFilters = () => {
    const routeApi = getRouteApi('/analysis/')
    const { query } = routeApi.useSearch()
    const navigate = routeApi.useNavigate()
    const columnFilters = useMemo(() => deserialize(query), [query])

    const setFilters = useCallback((updater: ColumnFiltersState | ((arg0: ColumnFiltersState) => ColumnFiltersState)) => {
        navigate({
            search: (prevSearch) => {
                const newFilters = updater instanceof Function ? updater(deserialize(prevSearch.query)) : updater
                const params = serialize(newFilters);
                return { query: params }
            }
        });
    }, [navigate]);

    return { columnFilters, setColumnFilters: setFilters }
}

const columnHelper = createColumnHelper<Data>()
const columns = [
    columnHelper.accessor('transactions.id', {
        id: 'id',
        header: 'Id Transaccion',
        cell: info => info.getValue(),
        footer: info => info.column.id,
    }),
    columnHelper.accessor('transactions.description', {
        header: 'Descripcion',
        cell: info => info.getValue(),
        footer: info => info.column.id,
    }),
    columnHelper.accessor('transactions.slNotes', {
        header: 'Notas',
        cell: info => info.getValue() !== 'None' ? info.getValue() : '',
        footer: info => info.column.id,
    }),
    columnHelper.accessor('transactions.datePosted', {
        header: 'Fecha',
        cell: info => info.getValue().toISODate(),
        footer: info => info.column.id,
    }),
    columnHelper.accessor('accounts.accountType', {
        header: 'Tipo de cuenta',
        cell: info => info.getValue(),
        footer: info => info.column.id,
    }),
    columnHelper.accessor('accounts.name', {
        header: 'Nombre de cuenta',
        cell: info => info.getValue(),
        footer: info => info.column.id,
    }),
    columnHelper.accessor('splits.account', {
        id: 'idAccount',
        header: 'Id Cuenta',
        cell: info => info.getValue(),
        footer: info => info.column.id,
    }),
    columnHelper.accessor('splits.value', {
        header: 'Valor',
        cell: info => info.getValue(),
        footer: info => info.column.id,
        enableColumnFilter: false
    }),
    columnHelper.display({
        id: 'select-col',
        header: ({ table }) => (
            <div className="flex flex-col gap-y-4">
                <span>Toggle</span>
                <Checkbox
                    checked={table.getIsAllRowsSelected()}
                    indeterminate={table.getIsSomeRowsSelected()}
                    onChange={table.getToggleAllRowsSelectedHandler()} //or getToggleAllPageRowsSelectedHandler
                />
            </div>
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                disabled={!row.getCanSelect()}
                onChange={row.getToggleSelectedHandler()}
            />
        ),
    }),
]

export const TransactTable = (props: { data: Data[], setFilteredData: CallableFunction }) => {

    const { columnFilters, setColumnFilters } = useColumnFilters();
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 8,
    })
    const initialRowSelection = useMemo(() => props.data.reduce((d, row) => ({ ...d, [row.splits.id]: true }), {}), [props.data])

    const table = useReactTable<Data>({
        data: props.data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onPaginationChange: setPagination,
        onColumnFiltersChange: setColumnFilters,
        getRowId: row => row.splits.id,
        state: {
            pagination,
            columnFilters
        },
        initialState: {
            columnVisibility: {
                id: false,
                idAccount: false
            },
            rowSelection: initialRowSelection 
        }
    })

    const rows = table.getSelectedRowModel().flatRows;
    const { setFilteredData } = props;
    useEffect(() => {
        setFilteredData(rows.map((r) => r.original))
    }, [setFilteredData, rows])


    return <div>
        <table className="border-collapse border-spacing-y-4 border-shark-600 text-white">
            <thead>
                {table.getHeaderGroups().map(hg => (
                    <tr key={hg.id}>
                        {hg.headers.map(h => (
                            <th key={h.id} colSpan={h.colSpan}>
                                <div className="mb-2 p-1 ps-2">
                                    {h.isPlaceholder
                                        ? null
                                        : flexRender(
                                            h.column.columnDef.header,
                                            h.getContext()
                                        )}
                                    {{
                                        asc: ' 🔼',
                                        desc: ' 🔽',
                                    }[h.column.getIsSorted() as string] ?? null}
                                    {h.column.getCanFilter() ? (
                                        <div className="mt-2">
                                            <Filter column={h.column} table={table} />
                                        </div>
                                    ) : null}
                                </div>
                            </th>
                        ))}
                    </tr>
                ))}
            </thead>
            <tbody className="mt-2 bg-shark-800">
                {table.getRowModel().rows.map(row => (
                    <tr className="hover:bg-shark-600" key={row.id} onClick={row.getToggleSelectedHandler()}>
                        {row.getVisibleCells().map(cell => (
                            <td key={cell.id} className="border border-shark-600 p-2 ps-4 text-xs">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
            <tfoot>
                <tr>
                    <th></th>
                </tr>
            </tfoot>
        </table>
        <div className="mt-2 flex items-center gap-2 text-white">
            <button
                className="rounded p-1 bg-shark-800"
                onClick={() => table.firstPage()}
                disabled={!table.getCanPreviousPage()}
            >
                {'<<'}
            </button>
            <button
                className="rounded p-1 bg-shark-800"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
            >
                {'<'}
            </button>
            <button
                className="rounded p-1 bg-shark-800"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
            >
                {'>'}
            </button>
            <button
                className="rounded p-1 bg-shark-800"
                onClick={() => table.lastPage()}
                disabled={!table.getCanNextPage()}
            >
                {'>>'}
            </button>
            <span className="flex items-center gap-1">
                <div className="text-gray-400">Page</div>
                <span>
                    {table.getState().pagination.pageIndex + 1}
                </span>
                <div className="text-gray-400">of</div>
                <span>
                    {table.getPageCount().toLocaleString()}
                </span>
            </span>
            <span className="flex items-center gap-1">
                <span className="text-gray-400">| Go to page:</span>
                <input
                    type="number"
                    min='1'
                    defaultValue={table.getState().pagination.pageIndex + 1}
                    onChange={e => {
                        const page = e.target.value ? Number(e.target.value) - 1 : 0
                        table.setPageIndex(page)
                    }}
                    className="p-1 rounded w-16 bg-shark-800"
                />
            </span>
            <select
                className="p-2 rounded bg-shark-800"
                value={table.getState().pagination.pageSize}
                onChange={e => {
                    table.setPageSize(Number(e.target.value))
                }}
            >
                {[10, 20, 30, 40, 50].map(pageSize => (
                    <option key={pageSize} value={pageSize}>
                        Show {pageSize}
                    </option>
                ))}
            </select>
            <p><span className="text-gray-400">Showing </span>{table.getRowModel().rows.length.toLocaleString()}
                <span className="text-gray-400"> of </span>
                {table.getRowCount().toLocaleString()}
                <span className="text-gray-400"> Rows</span></p>
        </div>
    </div >
}

function Filter<D,>({ column, table, }: { column: Column<D, unknown>, table: Table<D> }) {
    const firstValue = table
        .getPreFilteredRowModel()
        .flatRows[0]?.getValue(column.id)

    const columnFilterValue = column.getFilterValue()

    if (typeof firstValue === 'number') {
        return <div className="flex space-x-2 text-black">
            <input
                type="number"
                value={((columnFilterValue as string).split(',').map((v) => Number(v)))?.[0] ?? ''}
                onChange={e =>
                    column.setFilterValue((old: string) => String([
                        e.target.value,
                        old.split(',')[1],
                    ]))
                }
                placeholder={`Min`}
                className="w-16 ps-2 border shadow rounded"
            />
            <input
                type="number"
                value={((columnFilterValue as string).split(',').map((v) => Number(v)))?.[1] ?? ''}
                onChange={e =>
                    column.setFilterValue((old: string) => String([
                        old.split(',')[0],
                        e.target.value
                    ]))
                }
                placeholder={`Max`}
                className="w-16 ps-2 border shadow rounded"
            />
        </div>
    }

    if (firstValue instanceof DateTime) {
        return <div className="flex space-x-2 text-black">
            <input
                type="date"
                value={(columnFilterValue as [DateTime, DateTime])?.[0].toISODate() ?? undefined}
                onChange={e =>
                    column.setFilterValue((old: [DateTime, DateTime]) => [
                        DateTime.fromFormat(e.target.value, 'yyyy-LL-dd'),
                        old?.[1],
                    ])
                }
                placeholder={`Min`}
                className="w-16 ps-2 border shadow rounded"
            />
            <input
                type="date"
                value={(columnFilterValue as [DateTime, DateTime])?.[1].toISODate() ?? undefined}
                onChange={e =>
                    column.setFilterValue((old: [DateTime, DateTime]) => [
                        old?.[0],
                        DateTime.fromFormat(e.target.value, 'yyyy-LL-dd'),
                    ])
                }
                placeholder={`Max`}
                className="w-16 ps-2 border shadow rounded"
            />
        </div>
    }

    return <input
        type="text"
        value={(columnFilterValue ?? '') as string}
        onChange={e => column.setFilterValue(e.target.value)}
        placeholder={`Search...`}
        className="w-24 ps-2 border shadow rounded text-black"
    />
}