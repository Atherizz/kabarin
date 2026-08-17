import type { AppDatabase } from "@kabarin/db";
import type { AuthInstance, AuthSession } from "@kabarin/auth";

// No Bindings — running on Bun, env vars accessed via process.env
export type AppEnv = {
  Variables: {
    db: AppDatabase;
    auth: AuthInstance;
    session: AuthSession | null;
  };
};
