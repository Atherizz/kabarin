import { z, ChangePasswordSchema } from "@kabarin/types";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";

export class ChangePasswordEndpoint extends ApiRoute {
  schema = {
    tags: ["Auth"],
    summary: "Change account password (Shared for All Roles)",
    description:
      "Allows any authenticated user (cadre, volunteer, family, admin) to change their password. Managed by Better Auth.",
    request: {
      body: {
        content: { "application/json": { schema: ChangePasswordSchema } },
        required: true,
      },
    },
    responses: {
      "200": {
        description: "Password changed successfully",
        content: {
          "application/json": {
            schema: z.object({
              status: z.boolean().optional(),
              message: z.string().optional(),
            }),
          },
        },
      },
      "400": {
        description: "Invalid current password or validation error",
        content: {
          "application/json": {
            schema: z.object({ message: z.string() }),
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
