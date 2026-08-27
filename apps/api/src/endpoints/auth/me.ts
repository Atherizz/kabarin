import { z, UserResponseSchema } from "@kabarin/types";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole } from "../../lib/auth-guard";

export class MeEndpoint extends ApiRoute {
  schema = {
    tags: ["Auth & Session"],
    summary: "Get current authenticated user",
    description: "Returns the profile of the currently authenticated user based on their session cookie.",
    responses: {
      "200": {
        description: "Authenticated user profile",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: UserResponseSchema,
            }),
          },
        },
      },
      "401": {
        description: "No valid session found",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(false),
              error: z.string(),
            }),
          },
        },
      },
    },
  };

  async handle(c: Context<AppEnv>) {
    const session = assertRole(c);
    const { user } = session;

    return c.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: (user.role as "admin" | "cadre" | "volunteer" | "family") ?? "cadre",
        communityUnitId: user.communityUnitId ?? null,
        phone: user.phone ?? null,
        emailVerified: user.emailVerified,
        image: user.image ?? null,
        createdAt: new Date(user.createdAt).toISOString(),
      },
    });
  }
}
