import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth";
import { elderly } from "./elderly";
import { volunteers } from "./volunteers";
import { volunteerVisits } from "./visits";
import { chatMessages } from "./chat";

export const communityUnits = pgTable("community_units", {
  id: text("id").primaryKey(),
  // Unique composite code derived from Kemendagri subdistrict code + RW + RT
  // e.g. "3573051001-RW03-RT05" — prevents duplicate RT registrations
  code: varchar("code", { length: 60 }).notNull().unique(),
  // Human-readable label, e.g. "RT 05 / RW 03, Kel. Ketawanggede"
  name: varchar("name", { length: 255 }).notNull(),
  province: varchar("province", { length: 100 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  // Sub-district (kecamatan)
  district: varchar("district", { length: 100 }).notNull(),
  // Village / kelurahan / desa
  subdistrict: varchar("subdistrict", { length: 100 }).notNull(),
  // Kemendagri village code used to build the unique code field
  subdistrictCode: varchar("subdistrict_code", { length: 20 }).notNull(),
  rw: varchar("rw", { length: 10 }).notNull(),
  rt: varchar("rt", { length: 10 }).notNull(),
  // Local health facility contacts — used for Tier 3 emergency fast-track referral
  healthFacilityName: varchar("health_facility_name", { length: 255 }),
  healthFacilityPhone: varchar("health_facility_phone", { length: 30 }),
  communityHealthWorkerPhone: varchar("community_health_worker_phone", { length: 30 }),
  ambulancePhone: varchar("ambulance_phone", { length: 30 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const communityUnitsRelations = relations(communityUnits, ({ many }) => ({
  users: many(user),
  elderly: many(elderly),
  volunteers: many(volunteers),
  visits: many(volunteerVisits),
  messages: many(chatMessages),
}));
