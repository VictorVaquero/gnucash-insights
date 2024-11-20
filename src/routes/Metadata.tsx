import {useOutletContext} from 'react-router';
import {DropDownForm} from "@/components/DropDownForm.tsx";
import {KpiCard} from "@/components/KpiCard.tsx";
import {RootContext} from "@/routes/Root.tsx";

// TODO: Fix to datetime
const parseDate = (dt: string) => new Date(dt).toLocaleString('es-ES', {'year': 'numeric', 'month': 'short', 'day': 'numeric'})

export const Metadata = () => {

    const {fileList, fileName, setFileName, bookList, bookId, setBookId} = useOutletContext<RootContext>();

    const fileOptions = fileList?.map((item) => ({
        'key': item.datetime, 'value': parseDate(item.datetime)
    })) ?? [];

    const bookOptions = bookList?.map((item) => ({'key': item.book, 'value': item.book})) ?? [];

    const book = bookList?.filter((item) => item.book === bookId)[0];

    return <div className='p-10 flex flex-col gap-y-4'>
        <DropDownForm id='files' label='Archivo' list={fileOptions} value={fileName} setValue={setFileName}/>
        <DropDownForm id='books' label='Libro' list={bookOptions} value={bookId} setValue={setBookId}/>
        <div className='mt-6 flex flex-row flex-wrap gap-x-6 gap-y-4'>
            <KpiCard name='Fecha inicial' value={book ? parseDate(book.first_transaction) : '-'}/>
            <KpiCard name='Fecha final' value={book? parseDate(book.last_transaction) : '-'}/>
            <KpiCard name='Cuentas' value={book?.number_of_accounts ?? '0'}/>
            <KpiCard name='Transacciones' value={book?.number_of_transactions ?? '0'}/>
            <KpiCard name='Monedas' value={book?.number_of_commodities ?? '0'}/>
        </div>
    </div>
}