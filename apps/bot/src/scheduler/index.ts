import cron from "node-cron";
import type { WASocket } from "@whiskeysockets/baileys";
import type { AppDatabase } from "@kabarin/db";
import { processMorningGreetings } from "./morning-greeting";
import { processGracePeriodReminders, processGracePeriodEscalations } from "./grace-period";
import { processVolunteerTimeout } from "./fallback-escalation";
import { processRiskScoreUpdate } from "./risk-score-cron";

// Requires active WhatsApp socket — called after onReady
export function startScheduler(sock: WASocket, db: AppDatabase): void {
  console.log("[scheduler] WhatsApp-dependent cron jobs started");

  cron.schedule("* * * * *", async () => {
    try {
      await processMorningGreetings(sock, db);
      await processGracePeriodReminders(sock, db);
      await processGracePeriodEscalations(sock, db);
      await processVolunteerTimeout(sock, db);
    } catch (err) {
      console.error("[scheduler] Error during cron execution:", err);
    }
  });
}

// DB-only — runs independently of WhatsApp connection, called at bot startup
export function startDbScheduler(db: AppDatabase): void {
  console.log("[scheduler] DB-only cron jobs started");

  // Daily risk score batch update — 06:00 WIB (UTC+7 = 23:00 UTC)
  cron.schedule("0 23 * * *", async () => {
    try {
      await processRiskScoreUpdate(db);
    } catch (err) {
      console.error("[scheduler] Error during risk score cron:", err);
    }
  });
}

export * from "./morning-greeting";
export * from "./grace-period";
export * from "./fallback-escalation";
export * from "./risk-score-cron";
