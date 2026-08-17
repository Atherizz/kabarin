import { pgTable, text, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { elderly } from "./elderly";

export const elderlyMedications = pgTable("elderly_medications", {
  id: text("id").primaryKey(),
  elderlyId: text("elderly_id")
    .notNull()
    .references(() => elderly.id, { onDelete: "cascade" }),
  // Extracted from Smart OCR prescription scan (e.g. "Hypertension")
  conditionName: varchar("condition_name", { length: 100 }).notNull(),
  // Drug name (e.g. "Amlodipine 5mg")
  medicationName: varchar("medication_name", { length: 255 }).notNull(),
  // Dosage string (e.g. "5mg", "1 tablet")
  dosage: varchar("dosage", { length: 100 }).notNull(),
  // Frequency in natural language (e.g. "once a day")
  frequency: varchar("frequency", { length: 50 }).notNull(),
  timeOfDay: text("time_of_day")
    .$type<"morning" | "afternoon" | "evening" | "bedtime">()
    .notNull()
    .default("morning"),
  timingInstruction: text("timing_instruction")
    .$type<"before_meal" | "after_meal" | "with_meal" | "any_time">()
    .notNull()
    .default("after_meal"),
  // HH:MM — triggers WA reminder via bot scheduler
  reminderTime: varchar("reminder_time", { length: 10 }).notNull().default("07:00"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const elderlyMedicationsRelations = relations(elderlyMedications, ({ one }) => ({
  elderly: one(elderly, {
    fields: [elderlyMedications.elderlyId],
    references: [elderly.id],
  }),
}));
