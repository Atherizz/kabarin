import { z } from "@kabarin/types";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { getServices } from "../../services";

export class SignOutEndpoint extends ApiRoute {
  schema = {
    tags: ["Auth"],
    summary: "Sign out and invalidate session",
    responses: {
      "200": {
        description: "Session invalidated",
        content: {
          "application/json": {
            schema: z.object({ success: z.literal(true) }),
          },
        },
      },
    },
  };

  async handle(c: Context<AppEnv>) {
    const { auth } = getServices();
    return auth.handler(c.req.raw);
  }
}
