import cron from "node-cron";
import type { WASocket } from "@whiskeysockets/baileys";
import type { AppDatabase } from "@kabarin/db";
import { processMorningGreetings } from "./morning-greeting";
import { processGracePeriodReminders, processGracePeriodEscalations } from "./grace-period";

export function startScheduler(sock: WASocket, db: AppDatabase): void {
  console.log("[scheduler] Daily check-in and grace period cron jobs started");

  cron.schedule("* * * * *", async () => {
    try {
      await processMorningGreetings(sock, db);
      await processGracePeriodReminders(sock, db);
      await processGracePeriodEscalations(sock, db);
    } catch (err) {
      console.error("[scheduler] Error during cron execution:", err);
    }
  });
}

export * from "./morning-greeting";
export * from "./grace-period";
