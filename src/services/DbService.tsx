import initSqlJs  from "sql.js";
import { drizzle } from 'drizzle-orm/sql-js';
import wasm from "sql.js/dist/sql-wasm.wasm?url";

export const fetchDB = async () => {
    console.debug('Try setup db...')
    const SQL = await initSqlJs({ locateFile: () => wasm });
    const opfsRoot = await navigator.storage.getDirectory();
    const fileHandle = await opfsRoot.getFileHandle('cash.db');
    const file = await fileHandle.getFile();
    const db = new SQL.Database(new Uint8Array(await file.arrayBuffer()));
    const drizzleDb = drizzle(db, {casing: 'snake_case'});
    console.debug('Db setup ok')
    return drizzleDb;
}

