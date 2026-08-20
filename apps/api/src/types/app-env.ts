import type { AppDatabase } from "@kabarin/db";
import type { AuthInstance, AuthSession } from "@kabarin/auth";

export type AppEnv = {
  Bindings: {
    ENVIRONMENT?: string;
    NODE_ENV?: string;
    DATABASE_URL: string;
    BETTER_AUTH_URL: string;
    BETTER_AUTH_SECRET: string;
    TRUSTED_ORIGINS?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
  };
  Variables: {
    db: AppDatabase;
    auth: AuthInstance;
    session: AuthSession | null;
  };
};
