import { z, SignInSchema, UserResponseSchema } from "@kabarin/types";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";

export class SignInEndpoint extends ApiRoute {
  schema = {
    tags: ["Auth & Session"],
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
    const auth = c.get("auth");
    return auth.handler(c.req.raw);
  }
}
