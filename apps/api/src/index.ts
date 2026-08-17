import { Hono } from "hono";
import { cors } from "hono/cors";
import { fromHono } from "chanfana";
import { apiReference } from "@scalar/hono-api-reference";
import { injectServices } from "./middleware/inject-services";
import { requireAuth } from "./middleware/require-auth";
import { onError } from "./middleware/on-error";
import type { AppEnv } from "./types/app-env";
import { asRoute } from "./lib/api-route";

// Auth endpoints
import { SignUpEndpoint } from "./endpoints/auth/sign-up";
import { SignInEndpoint } from "./endpoints/auth/sign-in";
import { SignOutEndpoint } from "./endpoints/auth/sign-out";
import { GetSessionEndpoint } from "./endpoints/auth/get-session";
import { MeEndpoint } from "./endpoints/auth/me";

const app = new Hono<AppEnv>();

// Global middleware
app.use("*", cors({
  origin: process.env.TRUSTED_ORIGINS?.split(",") ?? ["http://localhost:5173"],
  credentials: true,
}));
app.use("*", injectServices);

// Protect all /api/* except /api/auth/* (handled and authenticated by Better Auth internally)
app.use("/api/*", async (c, next) => {
  if (c.req.path.startsWith("/api/auth/")) return next();
  return requireAuth(c, next);
});

// OpenAPI
const openapi = fromHono(app, {
  docs_url: null,
  redoc_url: null,
  openapi_url: "/openapi.json",
  schema: {
    info: {
      title: "Kabarin API",
      version: "1.0.0",
      description: "Sistem pemantauan kesejahteraan lansia berbasis komunitas RT",
    },
    servers: [{ url: "http://localhost:3000", description: "Local" }],
  },
});

// Auth endpoints — Chanfana documents them, Better Auth handles them
openapi.post("/api/auth/sign-up/email", asRoute(SignUpEndpoint));
openapi.post("/api/auth/sign-in/email", asRoute(SignInEndpoint));
openapi.post("/api/auth/sign-out", asRoute(SignOutEndpoint));
openapi.get("/api/auth/get-session", asRoute(GetSessionEndpoint));

// Protected endpoints
openapi.get("/api/me", asRoute(MeEndpoint));

// Public endpoints
app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

// Scalar API docs
app.get("/docs", apiReference({
  spec: { url: "/openapi.json" },
  theme: "kepler",
}));

app.onError(onError);

const port = Number(process.env.PORT) || 3000;
console.log(`🚀 Kabarin API → http://localhost:${port}`);
console.log(`📖 Docs        → http://localhost:${port}/docs`);

export default { port, fetch: app.fetch };
