import { createDB, type AppDatabase } from "@kabarin/db";
import { createAuth, type AuthInstance } from "@kabarin/auth";

let db: AppDatabase | null = null;
let auth: AuthInstance | null = null;

export function getServices() {
  if (!db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    db = createDB(url);
  }

  if (!auth) {
    const baseURL = process.env.BETTER_AUTH_URL;
    const secret = process.env.BETTER_AUTH_SECRET;
    if (!baseURL || !secret) throw new Error("BETTER_AUTH_URL or BETTER_AUTH_SECRET is not set");
    auth = createAuth(db, {
      baseURL,
      secret,
      googleClientId: process.env.GOOGLE_CLIENT_ID,
      googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    });
  }

  return { db, auth };
}
