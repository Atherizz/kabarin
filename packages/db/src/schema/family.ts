import { pgTable, text, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { elderly } from "./elderly";
import { user } from "./auth";
import { escalationLogs } from "./escalations";

export const elderlyFamily = pgTable("elderly_family", {
  id: text("id").primaryKey(),
  elderlyId: text("elderly_id")
    .notNull()
    .references(() => elderly.id, { onDelete: "cascade" }),
  // Linked if the family member has a registered portal account
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  name: varchar("name", { length: 255 }).notNull(),
  // WhatsApp number — used for Tier 2 alert escalation
  phone: varchar("phone", { length: 30 }).notNull(),
  // e.g. "child", "grandchild", "sibling", "relative"
  relationship: varchar("relationship", { length: 50 }).notNull(),
  isPrimaryContact: boolean("is_primary_contact").notNull().default(false),
  // Short-lived token for the 1-tap /status/:token family status page
  accessToken: varchar("access_token", { length: 64 }).notNull().unique(),
  notifyViaWhatsapp: boolean("notify_via_whatsapp").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const elderlyFamilyRelations = relations(elderlyFamily, ({ one, many }) => ({
  elderly: one(elderly, {
    fields: [elderlyFamily.elderlyId],
    references: [elderly.id],
  }),
  userAccount: one(user, {
    fields: [elderlyFamily.userId],
    references: [user.id],
  }),
  escalationsTriggered: many(escalationLogs),
}));
