import { z, SignInSchema, UserResponseSchema } from "@kabarin/types";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { getServices } from "../../services";

export class SignInEndpoint extends ApiRoute {
  schema = {
    tags: ["Auth"],
    summary: "Sign in with email and password",
    request: {
      body: {
        content: {
          "application/json": { schema: SignInSchema },
        },
        required: true,
      },
    },
    responses: {
      "200": {
        description: "Session established",
        content: {
          "application/json": {
            schema: z.object({
              token: z.string(),
              user: UserResponseSchema,
            }),
          },
        },
      },
      "401": {
        description: "Invalid email or password",
        content: {
          "application/json": {
            schema: z.object({ message: z.string() }),
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
