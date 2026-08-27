import crypto from "crypto";
import type { AppDatabase } from "../create-db";
import { elderlyVolunteers } from "../schema";
import {
  ELD_SOEPARDI_ID,
  ELD_AMINAH_ID,
  ELD_KARTOWIJOYO_ID,
  ELD_SRI_ID,
  VOL_DIMAS_ID,
  VOL_WAHYU_ID,
} from "./constants";

export async function seedAssignments(db: AppDatabase) {
  await db.insert(elderlyVolunteers).values([
    // Mas Dimas Prasetyo (3 assignments = 3/3 capacity)
    {
      id: crypto.randomUUID(),
      elderlyId: ELD_SOEPARDI_ID,
      volunteerId: VOL_DIMAS_ID,
      isPrimary: true,
    },
    {
      id: crypto.randomUUID(),
      elderlyId: ELD_KARTOWIJOYO_ID,
      volunteerId: VOL_DIMAS_ID,
      isPrimary: true,
    },
    {
      id: crypto.randomUUID(),
      elderlyId: ELD_SRI_ID,
      volunteerId: VOL_DIMAS_ID,
      isPrimary: true,
    },
    // Mas Dimas Wahyu (2 assignments = 2/3 capacity)
    {
      id: crypto.randomUUID(),
      elderlyId: ELD_AMINAH_ID,
      volunteerId: VOL_WAHYU_ID,
      isPrimary: true,
    },
    {
      id: crypto.randomUUID(),
      elderlyId: ELD_KARTOWIJOYO_ID,
      volunteerId: VOL_WAHYU_ID,
      isPrimary: false, // Secondary responder
    },
  ]);
}
