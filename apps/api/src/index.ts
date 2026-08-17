import { Hono } from "hono";
import { cors } from "hono/cors";
import { fromHono } from "chanfana";
import { apiReference } from "@scalar/hono-api-reference";
import { injectServices } from "./middleware/inject-services";
import { onError } from "./middleware/on-error";
import type { AppEnv } from "./types/app-env";
import { getServices } from "./services";

const app = new Hono<AppEnv>();

app.use("*", cors({
  origin: process.env.TRUSTED_ORIGINS?.split(",") ?? ["http://localhost:5173"],
  credentials: true,
}));

app.use("*", injectServices);

// Better Auth handles all /api/auth/* routes automatically
app.all("/api/auth/*", (c) => {
  const { auth } = getServices();
  return auth.handler(c.req.raw);
});

const openapi = fromHono(app, {
  docs_url: null,
  redoc_url: null,
  openapi_url: "/api/openapi.json",
  schema: {
    info: {
      title: "Kabarin API",
      version: "1.0.0",
      description: "Sistem pemantauan kesejahteraan lansia berbasis komunitas RT",
    },
    servers: [{ url: "http://localhost:3000", description: "Local" }],
  },
});

// Register OpenAPI endpoints here:
app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

app.get("/docs", apiReference({
  spec: { url: "/api/openapi.json" },
  theme: "kepler",
}));

app.onError(onError);

const port = Number(process.env.PORT) || 3000;

console.log(`🚀 Kabarin API → http://localhost:${port}`);
console.log(`📖 Docs        → http://localhost:${port}/docs`);

export default { port, fetch: app.fetch };
