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
  urgency: "normal" | "needs_attention" | "emergency";
  status?: "green" | "yellow" | "red";
  sentiment?: "positive" | "neutral" | "concerned" | "distressed";
  symptoms: string[];
  medicationCompliance: boolean | null;
  shouldEscalate?: boolean;
  escalationTier?: 1 | 2 | 3 | null;
  escalationReason?: string | null;
  clinicalReasoning: string;
  recommendedAction: string;
  replyMessage?: string;
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
  sessionDate: date("session_date").notNull(),
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
  rawText: text("raw_text"),
  voiceAudioUrl: text("voice_audio_url"),
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
