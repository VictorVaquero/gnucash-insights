import { FullTransaction } from "@/services/entities"
import { Column, ColumnFiltersState, OnChangeFn, PaginationState, Table, createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table"
import { DateTime } from "luxon"
import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"

const deserialize = (searchParams: URLSearchParams): ColumnFiltersState=>{
    //console.debug("Deserialize: ", searchParams);
    return Array.from(searchParams.entries()).map(([k, v])=>({'id':k, 'value': v}));
}
const serialize = (filters: ColumnFiltersState): URLSearchParams=>{
    const url = filters.map(x => [String(x.id), String(x.value)]);
    //console.debug("Serialize: ", url);
    return new URLSearchParams(url);
}

const useFilter = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(deserialize(searchParams));

    console.debug("Current search params: ", searchParams);
    console.debug("Current page filter: ", columnFilters);
    
    useEffect(()=>{
        if(columnFilters !== deserialize(searchParams)) {
            console.debug('Search is updated, update filters with: ', deserialize(searchParams))
            setColumnFilters(deserialize(searchParams))
        }
    }, [searchParams])

    const setFilters = (updater: ColumnFiltersState|((arg0: ColumnFiltersState) => ColumnFiltersState)) => {
        console.debug('SetFilters, set search')
        setColumnFilters((old: ColumnFiltersState)=>{
            const newFilters = updater instanceof Function ? updater(old) : updater
            const params = serialize(newFilters);
            setSearchParams(params);
            return newFilters
        });
    };

    return [columnFilters, setFilters]
}

const columnHelper = createColumnHelper<FullTransaction>()

const columns = [
    columnHelper.accessor('transaction', {
        header: 'Id Transaccion',
        cell: info => info.getValue(),
        footer: info => info.column.id,
    }),
    columnHelper.accessor('description', {
        header: 'Descripcion',
        cell: info => info.getValue(),
        footer: info => info.column.id,
    }),
    columnHelper.accessor('notes', {
        header: 'Notas',
        cell: info => info.getValue() !== 'None' ? info.getValue() : '',
        footer: info => info.column.id,
    }),
    columnHelper.accessor('posted', {
        header: 'Fecha',
        cell: info => DateTime.fromISO(info.getValue()).toFormat('yyyy LLL dd'),
        footer: info => info.column.id,
    }),
    columnHelper.accessor('type', {
        header: 'Tipo de cuenta',
        cell: info => info.getValue(),
        footer: info => info.column.id,
    }),
    columnHelper.accessor('name', {
        header: 'Nombre de cuenta',
        cell: info => info.getValue(),
        footer: info => info.column.id,
    }),
    columnHelper.accessor('account', {
        header: 'Id Cuenta',
        cell: info => info.getValue(),
        footer: info => info.column.id,
    }),
    columnHelper.accessor('value', {
        header: 'Valor',
        cell: info => info.getValue(),
        footer: info => info.column.id,
    }),
]

export const TransactTable = (props: { data: FullTransaction[], setFilteredData: CallableFunction }) => {
    
    const [columnFilters, setColumnFilters] = useFilter();

    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    })

    const table = useReactTable<FullTransaction>({
        data: props.data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onPaginationChange: setPagination,
        onColumnFiltersChange: setColumnFilters as OnChangeFn<ColumnFiltersState>,
        state: {
            pagination,
            //@ts-expect-error Who knows
            columnFilters 
        },
    })
    
    const rows = table.getFilteredRowModel().flatRows;
    const {setFilteredData} = props;
    useEffect(()=>{
        setFilteredData(rows.map((r)=>r.original))
    }, [setFilteredData, rows])



    return <div>
        <table className="border-collapse border-spacing-y-4 border-shark-600 text-white">
            <thead>
                {table.getHeaderGroups().map(hg => (
                    <tr key={hg.id}>
                        {hg.headers.map(h => (
                            <th key={h.id}>
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
                    <tr key={row.id}>
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

  return typeof firstValue === 'number' ? (
    <div className="flex space-x-2 text-black">
      <input
        type="number"
        value={(columnFilterValue as [number, number])?.[0] ?? ''}
        onChange={e =>
          column.setFilterValue((old: [number, number]) => [
            e.target.value,
            old?.[1],
          ])
        }
        placeholder={`Min`}
        className="w-16 ps-2 border shadow rounded"
      />
      <input
        type="number"
        value={(columnFilterValue as [number, number])?.[1] ?? ''}
        onChange={e =>
          column.setFilterValue((old: [number, number]) => [
            old?.[0],
            e.target.value,
          ])
        }
        placeholder={`Max`}
        className="w-16 ps-2 border shadow rounded"
      />
    </div>
  ) : (
    <input
      type="text"
      value={(columnFilterValue ?? '') as string}
      onChange={e => column.setFilterValue(e.target.value)}
      placeholder={`Search...`}
      className="w-24 ps-2 border shadow rounded text-black"
    />
  )
}