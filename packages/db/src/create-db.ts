import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type AppDatabase = ReturnType<typeof createDB>;

export function createDB(databaseUrl: string) {
  const client = postgres(databaseUrl);
  return drizzle(client, { schema });
}
