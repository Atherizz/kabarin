import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { communityUnits } from "./community";
import { elderly } from "./elderly";
import { checkinSessions } from "./checkins";

export const chatMessages = pgTable("chat_messages", {
  id: text("id").primaryKey(),
  communityUnitId: text("community_unit_id")
    .notNull()
    .references(() => communityUnits.id, { onDelete: "cascade" }),
  // Nullable if message is a system notification to family or volunteer
  elderlyId: text("elderly_id").references(() => elderly.id, {
    onDelete: "cascade",
  }),
  // Nullable if message is an intra-day SOS or outside a scheduled daily checkin
  checkinSessionId: text("checkin_session_id").references(
    () => checkinSessions.id,
    { onDelete: "set null" }
  ),
  // "elderly" | "bot" | "volunteer" | "family" | "system"
  senderType: text("sender_type")
    .$type<"elderly" | "bot" | "volunteer" | "family" | "system">()
    .notNull(),
  senderPhone: varchar("sender_phone", { length: 30 }),
  recipientPhone: varchar("recipient_phone", { length: 30 }),
  // "text" | "voice" | "image" | "system_alert"
  messageType: text("message_type")
    .$type<"text" | "voice" | "image" | "system_alert">()
    .notNull()
    .default("text"),
  // Message body text or Whisper audio transcript
  content: text("content").notNull(),
  // Storage URL for audio file (if VN) or image
  mediaUrl: text("media_url"),
  // Context metadata: Baileys message ID, AI tool calls executed, token counts
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  communityUnit: one(communityUnits, {
    fields: [chatMessages.communityUnitId],
    references: [communityUnits.id],
  }),
  elderly: one(elderly, {
    fields: [chatMessages.elderlyId],
    references: [elderly.id],
  }),
  checkinSession: one(checkinSessions, {
    fields: [chatMessages.checkinSessionId],
    references: [checkinSessions.id],
  }),
}));
