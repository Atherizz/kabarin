import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { communityUnits } from "./community";
import { elderly } from "./elderly";
import { checkinSessions } from "./checkins";
import { volunteerVisits } from "./visits";
import { elderlyFamily } from "./family";

export const escalationLogs = pgTable("escalation_logs", {
  id: text("id").primaryKey(),
  communityUnitId: text("community_unit_id")
    .notNull()
    .references(() => communityUnits.id, { onDelete: "cascade" }),
  elderlyId: text("elderly_id")
    .notNull()
    .references(() => elderly.id, { onDelete: "cascade" }),
  checkinSessionId: text("checkin_session_id").references(
    () => checkinSessions.id,
    { onDelete: "set null" }
  ),
  // Linked if this escalation was triggered on-demand by a family member via /status/:token
  triggeredByFamilyId: text("triggered_by_family_id").references(
    () => elderlyFamily.id,
    { onDelete: "set null" }
  ),
  // Current active tier: 1 (Volunteer visit), 2 (Family + RT alert), 3 (Puskesmas/ILP referral)
  tier: integer("tier").notNull().default(1),
  // "no_response" | "ai_urgent_triage" | "manual_trigger" | "family_on_demand" | "visit_emergency"
  triggerReason: varchar("trigger_reason", { length: 100 }).notNull(),
  status: text("status")
    .$type<"open" | "in_progress" | "resolved" | "cancelled">()
    .notNull()
    .default("open"),
  // Timestamp when Tier 2 WhatsApp alerts were sent to registered family members
  familyNotifiedAt: timestamp("family_notified_at"),
  // Tier 3: Puskesmas / ILP fast-track referral card dispatched
  puskesmasReferralDispatched: boolean("puskesmas_referral_dispatched")
    .notNull()
    .default(false),
  puskesmasDispatchedAt: timestamp("puskesmas_dispatched_at"),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by", { length: 100 }),
  resolutionNotes: text("resolution_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const escalationLogsRelations = relations(
  escalationLogs,
  ({ one, many }) => ({
    communityUnit: one(communityUnits, {
      fields: [escalationLogs.communityUnitId],
      references: [communityUnits.id],
    }),
    elderly: one(elderly, {
      fields: [escalationLogs.elderlyId],
      references: [elderly.id],
    }),
    checkinSession: one(checkinSessions, {
      fields: [escalationLogs.checkinSessionId],
      references: [checkinSessions.id],
    }),
    triggeredByFamily: one(elderlyFamily, {
      fields: [escalationLogs.triggeredByFamilyId],
      references: [elderlyFamily.id],
    }),
    visits: many(volunteerVisits),
  })
);
