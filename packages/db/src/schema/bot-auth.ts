import {
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const botAuthState = pgTable("bot_auth_state", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
