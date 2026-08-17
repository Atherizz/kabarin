import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types/app-env";

type UserRole = "admin" | "kader";

export function requireRole(...roles: UserRole[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const session = c.get("session");

    if (!session) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    const userRole = (session.user as any).role as UserRole;

    if (!roles.includes(userRole)) {
      return c.json({ success: false, error: "Forbidden" }, 403);
    }

    await next();
  });
}
