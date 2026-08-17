import { createMiddleware } from "hono/factory";
import { getServices } from "../services";
import type { AppEnv } from "../types/app-env";

export const injectServices = createMiddleware<AppEnv>(async (c, next) => {
  const { db, auth } = getServices();
  c.set("db", db);
  c.set("auth", auth);
  c.set("session", null);
  await next();
});
