import { Hono } from "hono";
import { getSocket } from "../client";
import { handleTestSend } from "./routes/test-send";
import { handleElderlyOnboarded } from "./routes/elderly-onboarded";
import { handleElderlySubmitted } from "./routes/elderly-submitted";
import { handleVolunteerCreated } from "./routes/volunteer-created";
import { handleVolunteerAssigned } from "./routes/volunteer-assigned";
import { handleEscalationResolved } from "./routes/escalation-resolved";
import { handleFamilySos } from "./routes/family-sos";
import type { AppDatabase } from "@kabarin/db";

export function createWebhookServer(db: AppDatabase): Hono {
  const app = new Hono();
  const secret = process.env.WEBHOOK_SECRET || "kabarin-bot-secret";

  app.get("/health", (c) => {
    const sock = getSocket();
    return c.json({
      status: "ok",
      botConnected: Boolean(sock?.user?.id),
      botPhone: sock?.user?.id || null,
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/webhook/*", async (c, next) => {
    const incomingSecret = c.req.header("x-webhook-secret");
    if (incomingSecret !== secret) {
      return c.json({ success: false, error: "Unauthorized webhook secret" }, 401);
    }
    return next();
  });

  app.post("/webhook/test-send", (c) => handleTestSend(c));
  app.post("/webhook/elderly-onboarded", (c) => handleElderlyOnboarded(c, db));
  app.post("/webhook/elderly-submitted", (c) => handleElderlySubmitted(c, db));
  app.post("/webhook/volunteer-created", (c) => handleVolunteerCreated(c, db));
  app.post("/webhook/volunteer-assigned", (c) => handleVolunteerAssigned(c, db));
  app.post("/webhook/escalation-resolved", (c) => handleEscalationResolved(c, db));
  app.post("/webhook/family-sos", (c) => handleFamilySos(c, db));

  return app;
}
