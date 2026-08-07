import { createClient } from "@libsql/client";
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";

export const setupTursoDB = ({ url, token }: { url: string; token: string }) => {
  const client = createClient({ url, authToken: token });
  return drizzleLibsql(client, { casing: "snake_case" });
};
