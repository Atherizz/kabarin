import { drizzle } from "drizzle-orm/neon-http";
import { neon, neonConfig } from "@neondatabase/serverless";
import * as schema from "./schema";

export type AppDatabase = ReturnType<typeof createDB>;

const DB_QUERY_TIMEOUT_MS = 10_000;

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DB_QUERY_TIMEOUT_MS);
  return fetch(input, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

neonConfig.fetchFunction = fetchWithTimeout;

export function createDB(databaseUrl: string) {
  const client = neon(databaseUrl);
  return drizzle(client, { schema });
}

