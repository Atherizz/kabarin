import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AppEnv } from "../types/app-env";

export const onError: ErrorHandler<AppEnv> = (err, c) => {
  console.error(`[ERROR] ${c.req.method} ${c.req.url}`, err);

  if (err instanceof HTTPException) {
    return c.json({ success: false, error: err.message }, err.status);
  }

  return c.json({ success: false, error: "Internal Server Error" }, 500);
};
