import { createDB, type AppDatabase } from "@kabarin/db";
import { createAuth, type AuthInstance } from "@kabarin/auth";
import type { AppEnv } from "./types/app-env";

let db: AppDatabase | null = null;
let auth: AuthInstance | null = null;

export function getServices(env?: AppEnv["Bindings"]) {
  if (!db) {
    const url = env?.DATABASE_URL || process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    db = createDB(url);
  }

  if (!auth) {
    const baseURL = env?.BETTER_AUTH_URL || process.env.BETTER_AUTH_URL;
    const secret = env?.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET;
    if (!baseURL || !secret) throw new Error("BETTER_AUTH_URL or BETTER_AUTH_SECRET is not set");
    auth = createAuth(db, {
      baseURL,
      secret,
      trustedOrigins: env?.TRUSTED_ORIGINS?.split(",") || process.env.TRUSTED_ORIGINS?.split(","),
      googleClientId: env?.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
      googleClientSecret: env?.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET,
    });
  }

  return { db, auth };
}
