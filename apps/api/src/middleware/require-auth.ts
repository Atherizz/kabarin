import { createMiddleware } from "hono/factory";
import { getSession } from "@kabarin/auth";
import type { AppEnv } from "../types/app-env";

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const auth = c.get("auth");
  const session = await getSession(auth, c.req.raw);

  if (!session) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  c.set("session", session);
  await next();
});
