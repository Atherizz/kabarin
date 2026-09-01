import type { AppEnv } from "../types/app-env";
import type { Context } from "hono";
import type {
  BotElderlyOnboardedPayload,
  BotElderlySubmittedPayload,
  BotVolunteerCreatedPayload,
  BotVolunteerAssignedPayload,
  BotEscalationResolvedPayload,
  BotFamilySosPayload,
} from "@kabarin/types";

type BotEvent =
  | { event: "elderly-onboarded"; payload: BotElderlyOnboardedPayload }
  | { event: "elderly-submitted"; payload: BotElderlySubmittedPayload }
  | { event: "volunteer-created"; payload: BotVolunteerCreatedPayload }
  | { event: "volunteer-assigned"; payload: BotVolunteerAssignedPayload }
  | { event: "escalation-resolved"; payload: BotEscalationResolvedPayload }
  | { event: "family-sos"; payload: BotFamilySosPayload };

export function triggerBotWebhook(c: Context<AppEnv>, trigger: BotEvent): void {
  const botUrl = c.env.BOT_WEBHOOK_URL;
  const secret = c.env.WEBHOOK_SECRET;

  if (!botUrl || !secret) {
    console.warn("[bot-webhook] BOT_WEBHOOK_URL or WEBHOOK_SECRET not configured — skipping.");
    return;
  }

  const url = `${botUrl}/webhook/${trigger.event}`;

  const task = fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-webhook-secret": secret,
    },
    body: JSON.stringify(trigger.payload),
  }).catch((err) => {
    console.error(`[bot-webhook] Failed to trigger ${trigger.event}:`, err);
  });

  c.executionCtx.waitUntil(task);
}
