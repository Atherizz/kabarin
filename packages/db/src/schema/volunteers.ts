import {
  pgTable,
  text,
  varchar,
  integer,
  doublePrecision,
  boolean,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { communityUnits } from "./community";
import { user } from "./auth";
import { elderly } from "./elderly";
import { volunteerVisits } from "./visits";

export const volunteers = pgTable("volunteers", {
  id: text("id").primaryKey(),
  communityUnitId: text("community_unit_id")
    .notNull()
    .references(() => communityUnits.id, { onDelete: "cascade" }),
  // Linked if the volunteer has a registered portal account
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 30 }).notNull(),
  address: text("address").notNull(),
  rt: varchar("rt", { length: 10 }).notNull(),
  rw: varchar("rw", { length: 10 }).notNull(),
  // Coordinates for proximity-based dispatch (< 10 min response radius)
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  // Max number of elderly this volunteer can be assigned to
  maxCapacity: integer("max_capacity").notNull().default(5),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const elderlyVolunteers = pgTable(
  "elderly_volunteers",
  {
    id: text("id").primaryKey(),
    elderlyId: text("elderly_id")
      .notNull()
      .references(() => elderly.id, { onDelete: "cascade" }),
    volunteerId: text("volunteer_id")
      .notNull()
      .references(() => volunteers.id, { onDelete: "cascade" }),
    isPrimary: boolean("is_primary").notNull().default(true),
    assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("elderly_volunteers_unique_idx").on(t.elderlyId, t.volunteerId),
  ]
);

export const volunteersRelations = relations(volunteers, ({ one, many }) => ({
  communityUnit: one(communityUnits, {
    fields: [volunteers.communityUnitId],
    references: [communityUnits.id],
  }),
  userAccount: one(user, {
    fields: [volunteers.userId],
    references: [user.id],
  }),
  assignedElderly: many(elderlyVolunteers),
  visits: many(volunteerVisits),
}));

export const elderlyVolunteersRelations = relations(elderlyVolunteers, ({ one }) => ({
  elderly: one(elderly, {
    fields: [elderlyVolunteers.elderlyId],
    references: [elderly.id],
  }),
  volunteer: one(volunteers, {
    fields: [elderlyVolunteers.volunteerId],
    references: [volunteers.id],
  }),
}));
