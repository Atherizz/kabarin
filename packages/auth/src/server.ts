import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { AppDatabase } from "@kabarin/db";
import { user, session, account, verification } from "@kabarin/db/schema";

export type AuthConfig = {
  baseURL: string;
  secret: string;
  trustedOrigins?: string[];
  googleClientId?: string;
  googleClientSecret?: string;
};

export function createAuth(db: AppDatabase, config: AuthConfig) {
  const googleProvider =
    config.googleClientId && config.googleClientSecret
      ? {
          google: {
            clientId: config.googleClientId,
            clientSecret: config.googleClientSecret,
          },
        }
      : undefined;

  return betterAuth({
    baseURL: config.baseURL,
    secret: config.secret,
    trustedOrigins: config.trustedOrigins ?? [
      "http://localhost:8787",
      "http://127.0.0.1:8787",
      "http://localhost:3000",
      "http://localhost:4321",
      "http://localhost:5173",
      "https://kabarin.pages.dev",
      "https://kabarin.atherizz.dev",
    ],
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user, session, account, verification },
    }),
    emailAndPassword: { enabled: true },
    socialProviders: googleProvider,
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: false,
          defaultValue: "cadre",
        },
        communityUnitId: {
          type: "string",
          required: false,
        },
        phone: {
          type: "string",
          required: false,
        },
      },
    },
  });
}

export type AuthInstance = ReturnType<typeof createAuth>;

export async function getSession(auth: AuthInstance, request: Request) {
  return auth.api.getSession({ headers: request.headers });
}

export type AuthSession = NonNullable<Awaited<ReturnType<typeof getSession>>>;
