import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

export type AppDatabase = ReturnType<typeof createDB>;

export function createDB(databaseUrl: string) {
  const client = neon(databaseUrl);
  return drizzle(client, { schema });
}
