import { betterAuth, APIError } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { AppDatabase } from "@kabarin/db";
import { user, session, account, verification, communityUnits, eq, or } from "@kabarin/db";

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
      "https://*.workers.dev",
    ],
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user, session, account, verification },
    }),
    emailAndPassword: { enabled: true },
    socialProviders: googleProvider,
    advanced: {
      crossSubDomainCookies: {
        enabled: config.baseURL.includes("atherizz.dev"),
        domain: config.baseURL.includes("atherizz.dev") ? ".atherizz.dev" : undefined,
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (userData) => {
            const allowedRoles = ["cadre", "volunteer", "family", "admin"];
            const inputRole = (userData as Record<string, unknown>).role;
            const role =
              typeof inputRole === "string" && allowedRoles.includes(inputRole)
                ? inputRole
                : "family";

            // Validate & Resolve communityUnitId (supports both UUID id or composite code e.g. "3573051007-RW10-RT01")
            let resolvedCommunityUnitId: string | null = null;
            const rawCommunityId = (userData as Record<string, unknown>).communityUnitId;

            if (typeof rawCommunityId === "string" && rawCommunityId.trim()) {
              const trimmed = rawCommunityId.trim();
              const found = await db.query.communityUnits.findFirst({
                where: or(
                  eq(communityUnits.id, trimmed),
                  eq(communityUnits.code, trimmed)
                ),
              });

              if (found) {
                resolvedCommunityUnitId = found.id;
              } else {
                throw new APIError("BAD_REQUEST", {
                  message: `Wilayah RT '${trimmed}' tidak ditemukan di sistem Kabarin. Pastikan RT sudah didaftarkan oleh Kader.`,
                });
              }
            }

            return {
              data: {
                ...userData,
                role,
                communityUnitId: resolvedCommunityUnitId,
              },
            };
          },
        },
      },
    },
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: false,
          defaultValue: "family",
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
