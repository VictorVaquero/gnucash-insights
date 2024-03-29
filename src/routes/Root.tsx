import {SideBar} from "@/components/SideBar.tsx";
import {Outlet} from "react-router-dom";
import {Header} from "@/components/Header.tsx";
import {useEffect, useState} from "react";
import { DateTime } from "luxon";
import { useBooks, useFiles } from "@/querys/apiQueryFunctions";
import { Book, File } from "@/querys/entities";

export interface RootContext {
    fileList: File[] | undefined,
    fileName: string,
    setFileName: CallableFunction,
    bookList: Book[] | undefined,
    bookId: string,
    setBookId: CallableFunction,
    domain: DateTime[],
    setDomain: CallableFunction
}
// TODO: Fix to DateTime
const parseDate = (dt: string) => new Date(dt).toLocaleString('es-ES', {'year': 'numeric', 'month': 'short', 'day': 'numeric'})

function Root() {
    const [fileName, setFileName] = useState('');
    const [bookId, setBookId] = useState('a3e63c8dea8543078a0e060021c9d647');
    const [domain, setDomain] = useState([DateTime.fromISO('2021-03'), DateTime.fromISO('2024-07')]);
    useEffect(()=>console.debug('Current file: ', fileName), [fileName]);
    useEffect(()=>console.debug('Current book: ', bookId), [bookId]);
    useEffect(()=>console.debug('Current domain: ', domain), [domain]);
    const files = useFiles();
    const books = useBooks();

    useEffect(()=>{
            if(files.data !== undefined && files.data.length>0) setFileName(files.data[files.data.length-1].datetime)
    }, [files])
    useEffect(()=>{
            if(books.data !== undefined && books.data.length>0) setBookId(books.data[books.data.length-1].book)
    }, [books])
    useEffect(()=>{
        const book = books.data?.filter((item) => item.book === bookId)[0];
        if(book !== undefined) setDomain([DateTime.fromISO(book.first_transaction), DateTime.fromISO(book.last_transaction)])
    }, [books.data, bookId])

    return <>
        <Header/>
        <div className='flex h-full'>
            <aside className='h-full'>
                <SideBar/>
            </aside>
            <main className='h-full w-full'>
                <Outlet context={{'fileList':files.data, fileName, setFileName, 'bookList': books.data, bookId, setBookId, domain, setDomain}}/>
            </main>
        </div>
    </>
}

export default Root
