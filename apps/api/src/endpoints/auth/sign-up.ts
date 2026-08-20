import { z, SignUpSchema, UserResponseSchema } from "@kabarin/types";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";

export class SignUpEndpoint extends ApiRoute {
  schema = {
    tags: ["Auth"],
    summary: "Register a new account",
    request: {
      body: {
        content: {
          "application/json": { schema: SignUpSchema },
        },
        required: true,
      },
    },
    responses: {
      "200": {
        description: "Account created and session established",
        content: {
          "application/json": {
            schema: z.object({
              token: z.string(),
              user: UserResponseSchema,
            }),
          },
        },
      },
      "422": {
        description: "Email already registered",
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
