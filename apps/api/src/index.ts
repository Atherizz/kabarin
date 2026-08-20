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

// Community endpoints
import { RegisterCommunityEndpoint } from "./endpoints/community/register";
import { GetMyCommunityEndpoint } from "./endpoints/community/me";
import { UpdateMyCommunityEndpoint } from "./endpoints/community/update-me";

// Elderly endpoints
import { ListElderlyEndpoint } from "./endpoints/elderly/list";
import { CreateElderlyEndpoint } from "./endpoints/elderly/create";
import { GetElderlyEndpoint } from "./endpoints/elderly/get";
import { UpdateElderlyEndpoint } from "./endpoints/elderly/update";
import { DeleteElderlyEndpoint } from "./endpoints/elderly/delete";
import { UpdateElderlyStatusEndpoint } from "./endpoints/elderly/update-status";

// Volunteer endpoints
import { ListVolunteersEndpoint } from "./endpoints/volunteers/list";
import { CreateVolunteerEndpoint } from "./endpoints/volunteers/create";
import { GetVolunteerEndpoint } from "./endpoints/volunteers/get";
import { UpdateVolunteerEndpoint } from "./endpoints/volunteers/update";
import { AssignVolunteerEndpoint } from "./endpoints/volunteers/assign";
import { UnassignVolunteerEndpoint } from "./endpoints/volunteers/unassign";
import { ListVolunteersByElderlyEndpoint } from "./endpoints/volunteers/list-by-elderly";

// Medication endpoints
import { ListMedicationsEndpoint } from "./endpoints/medications/list";
import { CreateMedicationEndpoint } from "./endpoints/medications/create";
import { UpdateMedicationEndpoint } from "./endpoints/medications/update";
import { DeleteMedicationEndpoint } from "./endpoints/medications/delete";

// Family endpoints
import { ListFamilyEndpoint } from "./endpoints/family/list";
import { CreateFamilyEndpoint } from "./endpoints/family/create";
import { UpdateFamilyEndpoint } from "./endpoints/family/update";
import { DeleteFamilyEndpoint } from "./endpoints/family/delete";
import { GetFamilyStatusEndpoint } from "./endpoints/family/get-status";

const app = new Hono<AppEnv>();

// Global middleware
app.use("*", async (c, next) => {
  const envOrigins = c.env?.TRUSTED_ORIGINS?.split(",") ?? process.env.TRUSTED_ORIGINS?.split(",");
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:4321",
    "http://localhost:8787",
    "http://localhost:3000",
    "https://kabarin.pages.dev",
    "https://kabarin.atherizz.dev",
    ...(envOrigins ?? []),
  ];

  return cors({
    origin: (origin) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return origin || "*";
      }
      return null;
    },
    allowHeaders: ["Content-Type", "Authorization", "Cookie", "x-webhook-secret"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })(c, next);
});
app.use("*", injectServices);

// Protect all /api/* except public endpoints
app.use("/api/*", async (c, next) => {
  if (c.req.path.startsWith("/api/auth/")) return next();
  if (c.req.path === "/api/community/register" && c.req.method === "POST") return next();
  if (c.req.path.startsWith("/api/family/status/")) return next();
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
  },
});

// Auth endpoints — Chanfana documents them, Better Auth handles them
openapi.post("/api/auth/sign-up/email", asRoute(SignUpEndpoint));
openapi.post("/api/auth/sign-in/email", asRoute(SignInEndpoint));
openapi.post("/api/auth/sign-out", asRoute(SignOutEndpoint));
openapi.get("/api/auth/get-session", asRoute(GetSessionEndpoint));

// Community endpoints
openapi.post("/api/community/register", asRoute(RegisterCommunityEndpoint));
openapi.get("/api/community/me", asRoute(GetMyCommunityEndpoint));
openapi.put("/api/community/me", asRoute(UpdateMyCommunityEndpoint));

// Elderly endpoints
openapi.get("/api/elderly", asRoute(ListElderlyEndpoint));
openapi.post("/api/elderly", asRoute(CreateElderlyEndpoint));
openapi.get("/api/elderly/:id", asRoute(GetElderlyEndpoint));
openapi.put("/api/elderly/:id", asRoute(UpdateElderlyEndpoint));
openapi.delete("/api/elderly/:id", asRoute(DeleteElderlyEndpoint));
openapi.patch("/api/elderly/:id/status", asRoute(UpdateElderlyStatusEndpoint));
openapi.get("/api/elderly/:id/volunteers", asRoute(ListVolunteersByElderlyEndpoint));

// Volunteer endpoints
openapi.get("/api/volunteers", asRoute(ListVolunteersEndpoint));
openapi.post("/api/volunteers", asRoute(CreateVolunteerEndpoint));
openapi.get("/api/volunteers/:id", asRoute(GetVolunteerEndpoint));
openapi.put("/api/volunteers/:id", asRoute(UpdateVolunteerEndpoint));
openapi.post("/api/volunteers/:id/assign", asRoute(AssignVolunteerEndpoint));
openapi.delete("/api/volunteers/:id/assign/:elderlyId", asRoute(UnassignVolunteerEndpoint));

// Medication endpoints
openapi.get("/api/elderly/:id/medications", asRoute(ListMedicationsEndpoint));
openapi.post("/api/elderly/:id/medications", asRoute(CreateMedicationEndpoint));
openapi.put("/api/elderly/:id/medications/:medId", asRoute(UpdateMedicationEndpoint));
openapi.delete("/api/elderly/:id/medications/:medId", asRoute(DeleteMedicationEndpoint));

// Family endpoints
openapi.get("/api/elderly/:id/family", asRoute(ListFamilyEndpoint));
openapi.post("/api/elderly/:id/family", asRoute(CreateFamilyEndpoint));
openapi.put("/api/elderly/:id/family/:familyId", asRoute(UpdateFamilyEndpoint));
openapi.delete("/api/elderly/:id/family/:familyId", asRoute(DeleteFamilyEndpoint));
openapi.get("/api/family/status/:token", asRoute(GetFamilyStatusEndpoint));

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

const port = Number(process.env.PORT) || 8787;
console.log(`🚀 Kabarin API → http://localhost:${port}`);
console.log(`📖 Docs        → http://localhost:${port}/docs`);

export default { port, fetch: app.fetch };
