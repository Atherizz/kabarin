import { z, UserResponseSchema } from "@kabarin/types";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";

export class GetSessionEndpoint extends ApiRoute {
  schema = {
    tags: ["Auth & Session"],
    summary: "Get current session",
    description: "Returns the active session and user, or null if not authenticated.",
    responses: {
      "200": {
        description: "Active session",
        content: {
          "application/json": {
            schema: z.object({
              session: z.object({
                id: z.string(),
                expiresAt: z.string().datetime(),
                token: z.string(),
                userId: z.string(),
              }),
              user: UserResponseSchema,
            }).nullable(),
          },
        },
      },
    },
  };

  async handle(c: Context<AppEnv>) {
    const auth = c.get("auth");
    return auth.handler(c.req.raw);
  }
}
