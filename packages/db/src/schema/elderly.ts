import {
  pgTable,
  text,
  varchar,
  integer,
  doublePrecision,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { communityUnits } from "./community";
import { user } from "./auth";
import { elderlyFamily } from "./family";
import { elderlyMedications } from "./medications";
import { elderlyVolunteers } from "./volunteers";
import { checkinSessions } from "./checkins";
import { escalationLogs } from "./escalations";
import { volunteerVisits } from "./visits";
import { chatMessages } from "./chat";

export const elderly = pgTable("elderly", {
  id: text("id").primaryKey(),
  communityUnitId: text("community_unit_id")
    .notNull()
    .references(() => communityUnits.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  // WhatsApp phone number — nullable if homebound / no smartphone (family-registered contact)
  phone: varchar("phone", { length: 30 }),
  age: integer("age").notNull(),
  gender: text("gender").$type<"male" | "female">().notNull().default("female"),
  address: text("address").notNull(),
  rt: varchar("rt", { length: 10 }).notNull(),
  rw: varchar("rw", { length: 10 }).notNull(),
  // Coordinates for Leaflet.js map visualization
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  mobilityStatus: text("mobility_status")
    .$type<"independent" | "needs_assistance" | "homebound">()
    .notNull()
    .default("independent"),
  // active: expects WA replies; passive: relies entirely on volunteer physical visits
  monitoringMode: text("monitoring_mode")
    .$type<"active" | "passive">()
    .notNull()
    .default("active"),
  // Cached current status — updated by Care Agent after each checkin/escalation cycle
  currentStatus: text("current_status")
    .$type<"green" | "yellow" | "red" | "grey">()
    .notNull()
    .default("green"),
  // Predictive risk score computed from health profile + checkin history (0–100)
  riskScore: doublePrecision("risk_score").notNull().default(0),
  // Chronic conditions and medical diagnoses (e.g. "Hipertensi, Riwayat Stroke") extracted from KMS/OCR
  medicalHistory: text("medical_history"),
  // Registration approval status (verified for cadre direct registration, pending_verification for family bottom-up)
  verificationStatus: text("verification_status")
    .$type<"verified" | "pending_verification" | "rejected">()
    .notNull()
    .default("verified"),
  preferredCheckinTime: varchar("preferred_checkin_time", { length: 10 })
    .notNull()
    .default("07:00"),
  // Cached AI-generated observational checklist based on medicalHistory + active medications
  // Null = not yet generated, visit dispatch will use fallback generic checklist
  defaultChecklist: jsonb("default_checklist"),
  notes: text("notes"),
  createdBy: text("created_by").references(() => user.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const elderlyRelations = relations(elderly, ({ one, many }) => ({
  communityUnit: one(communityUnits, {
    fields: [elderly.communityUnitId],
    references: [communityUnits.id],
  }),
  createdByUser: one(user, {
    fields: [elderly.createdBy],
    references: [user.id],
  }),
  familyMembers: many(elderlyFamily),
  medications: many(elderlyMedications),
  volunteerAssignments: many(elderlyVolunteers),
  checkinSessions: many(checkinSessions),
  escalations: many(escalationLogs),
  visits: many(volunteerVisits),
  chatMessages: many(chatMessages),
}));
