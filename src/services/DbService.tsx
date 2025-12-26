import { drizzle } from "drizzle-orm/sql-js";
import initSqlJs from "sql.js";
import wasm from "sql.js/dist/sql-wasm.wasm?url";

import { CognitoIdentityCredentialProvider } from "@aws-sdk/credential-providers";
import config from "../config.json";
import { awsReadDbOptions } from "./s3Service";

const DB_NAME = "cash.db";

export const saveFile = async (db: Uint8Array) => {
  const opfsRoot = await navigator.storage.getDirectory();
  const fileHandle = await opfsRoot.getFileHandle("cash.db", { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(db);
  await writable.close();
  console.debug("S3 db wrote to cash.db");
};

export const removeFile = async () => {
  try {
    const opfsRoot = await navigator.storage.getDirectory();
    await opfsRoot.removeEntry("cash.db");
  } catch (error) {
    console.error(error);
  }
};

export const setupDB = async () => {
  console.debug("Try read & setup db...");
  const SQL = await initSqlJs({ locateFile: () => wasm });
  const opfsRoot = await navigator.storage.getDirectory();
  const fileHandle = await opfsRoot.getFileHandle(DB_NAME);
  const file = await fileHandle.getFile();
  const db = new SQL.Database(new Uint8Array(await file.arrayBuffer()));
  const drizzleDb = drizzle(db, { casing: "snake_case" });
  console.debug("Db setup ok");
  return drizzleDb;
};

export const fetchDBOptions = ({
  fileName,
  user,
  credentials,
}: {
  fileName: string | undefined;
  user: string | undefined;
  credentials: CognitoIdentityCredentialProvider | undefined;
}) => {
  const folderPath =
    user === "guest" ? config.guestFolderPath : config.folderPath;
  const options = awsReadDbOptions({
    object: `${folderPath}${fileName}/cash.db`,
    user,
    credentials,
    enabled: !!fileName,
  });
  return options;
};
