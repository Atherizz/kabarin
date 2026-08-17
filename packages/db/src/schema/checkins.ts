import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { communityUnits } from "./community";
import { elderly } from "./elderly";
import { escalationLogs } from "./escalations";
import { chatMessages } from "./chat";

export interface AiTriageResult {
  // "normal" | "needs_attention" | "emergency"
  urgency: "normal" | "needs_attention" | "emergency";
  symptoms: string[];
  medicationCompliance: boolean | null;
  clinicalReasoning: string;
  recommendedAction: string;
  // Tools called by the Care Agent during this triage cycle (for observability)
  toolsExecuted: string[];
}

export const checkinSessions = pgTable("checkin_sessions", {
  id: text("id").primaryKey(),
  communityUnitId: text("community_unit_id")
    .notNull()
    .references(() => communityUnits.id, { onDelete: "cascade" }),
  elderlyId: text("elderly_id")
    .notNull()
    .references(() => elderly.id, { onDelete: "cascade" }),
  sessionDate: date("session_date").notNull(), // one record per elderly per day (YYYY-MM-DD)
  status: text("status")
    .$type<
      | "pending"
      | "sent"
      | "reminded"
      | "replied"
      | "escalated"
      | "resolved"
      | "skipped"
    >()
    .notNull()
    .default("pending"),
  sentAt: timestamp("sent_at"),
  reminderSentAt: timestamp("reminder_sent_at"),
  repliedAt: timestamp("replied_at"),
  replyType: text("reply_type")
    .$type<"text" | "voice" | "none">()
    .notNull()
    .default("none"),
  // Raw text reply or Whisper transcript from voice note
  rawText: text("raw_text"),
  // GCS/S3 URL for the original voice note file
  voiceAudioUrl: text("voice_audio_url"),
  // Structured output from the Agentic Care Orchestrator triage step
  aiTriageResult: jsonb("ai_triage_result").$type<AiTriageResult>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const checkinSessionsRelations = relations(
  checkinSessions,
  ({ one, many }) => ({
    communityUnit: one(communityUnits, {
      fields: [checkinSessions.communityUnitId],
      references: [communityUnits.id],
    }),
    elderly: one(elderly, {
      fields: [checkinSessions.elderlyId],
      references: [elderly.id],
    }),
    escalations: many(escalationLogs),
    messages: many(chatMessages),
  })
);
