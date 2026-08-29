import {
  pgTable,
  text,
  varchar,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { communityUnits } from "./community";
import { elderly } from "./elderly";
import { volunteers } from "./volunteers";
import { escalationLogs } from "./escalations";

export const volunteerVisits = pgTable("volunteer_visits", {
  id: text("id").primaryKey(),
  communityUnitId: text("community_unit_id")
    .notNull()
    .references(() => communityUnits.id, { onDelete: "cascade" }),
  elderlyId: text("elderly_id")
    .notNull()
    .references(() => elderly.id, { onDelete: "cascade" }),
  volunteerId: text("volunteer_id").references(() => volunteers.id, {
    onDelete: "set null",
  }),
  // Linked if this visit was triggered by an escalation incident
  escalationLogId: text("escalation_log_id").references(
    () => escalationLogs.id,
    { onDelete: "set null" }
  ),
  // "routine": periodic physical check-in for passive/homebound elderly
  // "escalation": responsive visit triggered by missed check-in or urgent AI triage
  visitType: text("visit_type")
    .$type<"routine" | "escalation">()
    .notNull()
    .default("routine"),
  // Short-lived JWT-like token for 1-tap /lapor/:token mobile web form
  formToken: varchar("form_token", { length: 64 }).notNull().unique(),
  tokenExpiresAt: timestamp("token_expires_at").notNull(),
  status: text("status")
    .$type<"pending" | "completed" | "expired">()
    .notNull()
    .default("pending"),
  visitedAt: timestamp("visited_at"),
  reportedCondition: text("reported_condition").$type<
    "good" | "unwell" | "emergency"
  >(),
  // "phone_off" | "not_home" | "sleeping" | "sick_or_fallen" | "other"
  reportedCause: varchar("reported_cause", { length: 100 }),
  medicationTaken: boolean("medication_taken"),
  volunteerNotes: text("volunteer_notes"),
  photoUrl: text("photo_url"),
  // AI-generated observational checklist for this visit (3-5 yes/no questions based on elderly medical profile)
  guidedChecklist: jsonb("guided_checklist").$type<Array<{ question: string; type: "yes_no" }>>(),
  // Volunteer's answers to the guided checklist submitted via /lapor/:token
  checklistResponses: jsonb("checklist_responses").$type<Array<{ question: string; answer: boolean }>>(),
  // Timestamp when WhatsApp dispatch was sent to the volunteer
  dispatchedAt: timestamp("dispatched_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const volunteerVisitsRelations = relations(
  volunteerVisits,
  ({ one }) => ({
    communityUnit: one(communityUnits, {
      fields: [volunteerVisits.communityUnitId],
      references: [communityUnits.id],
    }),
    elderly: one(elderly, {
      fields: [volunteerVisits.elderlyId],
      references: [elderly.id],
    }),
    volunteer: one(volunteers, {
      fields: [volunteerVisits.volunteerId],
      references: [volunteers.id],
    }),
    escalationLog: one(escalationLogs, {
      fields: [volunteerVisits.escalationLogId],
      references: [escalationLogs.id],
    }),
  })
);
