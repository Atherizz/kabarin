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
import { ChangePasswordEndpoint } from "./endpoints/auth/change-password";
import { MeEndpoint } from "./endpoints/auth/me";

// Community endpoints
import { RegisterCommunityEndpoint } from "./endpoints/community/register";
import { CheckCommunityEndpoint } from "./endpoints/community/check";
import { GetMyCommunityEndpoint } from "./endpoints/community/me";
import { UpdateMyCommunityEndpoint } from "./endpoints/community/update-me";

// Elderly endpoints
import { ListElderlyEndpoint } from "./endpoints/elderly/list";
import { CreateElderlyEndpoint } from "./endpoints/elderly/create";
import { GetElderlyEndpoint } from "./endpoints/elderly/get";
import { UpdateElderlyEndpoint } from "./endpoints/elderly/update";
import { DeleteElderlyEndpoint } from "./endpoints/elderly/delete";
import { UpdateElderlyStatusEndpoint } from "./endpoints/elderly/update-status";
import { VerifyElderlyEndpoint } from "./endpoints/elderly/verify";
import {
  GetEscalationChainEndpoint,
  UpdateEscalationChainEndpoint,
} from "./endpoints/elderly/escalation-chain";

// Volunteer endpoints
import { ListVolunteersEndpoint } from "./endpoints/volunteers/list";
import { CreateVolunteerEndpoint } from "./endpoints/volunteers/create";
import { GetVolunteerEndpoint } from "./endpoints/volunteers/get";
import { UpdateVolunteerEndpoint } from "./endpoints/volunteers/update";
import { AssignVolunteerEndpoint } from "./endpoints/volunteers/assign";
import { UnassignVolunteerEndpoint } from "./endpoints/volunteers/unassign";
import { ListVolunteersByElderlyEndpoint } from "./endpoints/volunteers/list-by-elderly";
import { GetVolunteerMeAssignmentsEndpoint } from "./endpoints/volunteers/me-assignments";

// Medication endpoints
import { ListMedicationsEndpoint } from "./endpoints/medications/list";
import { CreateMedicationEndpoint } from "./endpoints/medications/create";
import { UpdateMedicationEndpoint } from "./endpoints/medications/update";
import { DeleteMedicationEndpoint } from "./endpoints/medications/delete";

// Family endpoints
import { ListFamilyEndpoint } from "./endpoints/family/list";
import { CreateFamilyEndpoint } from "./endpoints/family/create";
import { CreateElderlyByFamilyEndpoint } from "./endpoints/family/create-elderly";
import { ListMeElderlyEndpoint } from "./endpoints/family/list-me-elderly";
import { UpdateFamilyEndpoint } from "./endpoints/family/update";
import { DeleteFamilyEndpoint } from "./endpoints/family/delete";
import { GetFamilyStatusEndpoint } from "./endpoints/family/get-status";
import { TriggerFamilySosEndpoint } from "./endpoints/family/trigger-sos";

// Visit endpoints
import { ListVisitsEndpoint } from "./endpoints/visits/list";
import { CreateVisitEndpoint } from "./endpoints/visits/create";
import { GetVisitEndpoint } from "./endpoints/visits/get";
import { GetVisitFormEndpoint } from "./endpoints/visits/get-form";
import { SubmitVisitFormEndpoint } from "./endpoints/visits/submit-form";

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
  if (c.req.path === "/api/community/check" && c.req.method === "GET") return next();
  if (c.req.path.startsWith("/api/family/status/")) return next();
  if (c.req.path.startsWith("/api/visits/form/")) return next();
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
      description: "Sistem Pemantauan Kesejahteraan Lansia Berbasis Komunitas RT",
    },
  },
});

// Auth endpoints — Chanfana documents them, Better Auth handles them
openapi.post("/api/auth/sign-up/email", asRoute(SignUpEndpoint));
openapi.post("/api/auth/sign-in/email", asRoute(SignInEndpoint));
openapi.post("/api/auth/sign-out", asRoute(SignOutEndpoint));
openapi.get("/api/auth/get-session", asRoute(GetSessionEndpoint));
openapi.post("/api/auth/change-password", asRoute(ChangePasswordEndpoint));

// Community endpoints
openapi.post("/api/community/register", asRoute(RegisterCommunityEndpoint));
openapi.get("/api/community/check", asRoute(CheckCommunityEndpoint));
openapi.get("/api/community/me", asRoute(GetMyCommunityEndpoint));
openapi.put("/api/community/me", asRoute(UpdateMyCommunityEndpoint));

// Elderly endpoints
openapi.get("/api/elderly", asRoute(ListElderlyEndpoint));
openapi.post("/api/elderly", asRoute(CreateElderlyEndpoint));
openapi.get("/api/elderly/:id", asRoute(GetElderlyEndpoint));
openapi.put("/api/elderly/:id", asRoute(UpdateElderlyEndpoint));
openapi.delete("/api/elderly/:id", asRoute(DeleteElderlyEndpoint));
openapi.patch("/api/elderly/:id/status", asRoute(UpdateElderlyStatusEndpoint));
openapi.patch("/api/elderly/:id/verify", asRoute(VerifyElderlyEndpoint));
openapi.get("/api/elderly/:id/escalation-chain", asRoute(GetEscalationChainEndpoint));
openapi.put("/api/elderly/:id/escalation-chain", asRoute(UpdateEscalationChainEndpoint));
openapi.get("/api/elderly/:id/volunteers", asRoute(ListVolunteersByElderlyEndpoint));

// Volunteer endpoints
openapi.get("/api/volunteers", asRoute(ListVolunteersEndpoint));
openapi.post("/api/volunteers", asRoute(CreateVolunteerEndpoint));
openapi.get("/api/volunteers/me/assignments", asRoute(GetVolunteerMeAssignmentsEndpoint));
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
openapi.post("/api/family/me/elderly", asRoute(CreateElderlyByFamilyEndpoint));
openapi.get("/api/family/me/elderly", asRoute(ListMeElderlyEndpoint));
openapi.get("/api/elderly/:id/family", asRoute(ListFamilyEndpoint));
openapi.post("/api/elderly/:id/family", asRoute(CreateFamilyEndpoint));
openapi.put("/api/elderly/:id/family/:familyId", asRoute(UpdateFamilyEndpoint));
openapi.delete("/api/elderly/:id/family/:familyId", asRoute(DeleteFamilyEndpoint));
openapi.get("/api/family/status/:token", asRoute(GetFamilyStatusEndpoint));
openapi.post("/api/family/status/:token/trigger", asRoute(TriggerFamilySosEndpoint));

// Visit endpoints
openapi.get("/api/visits", asRoute(ListVisitsEndpoint));
openapi.post("/api/visits", asRoute(CreateVisitEndpoint));
openapi.get("/api/visits/:id", asRoute(GetVisitEndpoint));
openapi.get("/api/visits/form/:token", asRoute(GetVisitFormEndpoint));
openapi.post("/api/visits/form/:token/submit", asRoute(SubmitVisitFormEndpoint));

// Protected endpoints
openapi.get("/api/me", asRoute(MeEndpoint));

import { getFilteredOpenApiSpec, renderScalarHtml, RoleGroupKey } from "./lib/role-openapi";

// Public endpoints
app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

// Role-filtered OpenAPI schemas
app.get("/openapi/:role", (c) => {
  const role = c.req.param("role").replace(/\.json$/, "") as RoleGroupKey;
  const fullSchema = (openapi as any).schema;
  const filtered = getFilteredOpenApiSpec(fullSchema, role);
  return c.json(filtered);
});

// Scalar API docs with Multi-Source Role Dropdown Selector
app.get("/docs", (c) => c.html(renderScalarHtml((openapi as any).schema)));

app.onError(onError);

const port = Number(process.env.PORT) || 8787;
console.log(`🚀 Kabarin API → http://localhost:${port}`);
console.log(`📖 Docs        → http://localhost:${port}/docs`);

export default { port, fetch: app.fetch };
