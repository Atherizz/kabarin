import crypto from "crypto";
import type { AppDatabase } from "../create-db";
import { elderlyVolunteers } from "../schema";
import {
  ELD_SOEPARDI_ID,
  ELD_KARTOWIJOYO_ID,
  VOL_DIMAS_ID,
} from "./constants";

export async function seedAssignments(db: AppDatabase) {
  await db.insert(elderlyVolunteers).values([
    // Mas Dimas Prasetyo (Primary Volunteer Mbah Soepardi)
    {
      id: crypto.randomUUID(),
      elderlyId: ELD_SOEPARDI_ID,
      volunteerId: VOL_DIMAS_ID,
      isPrimary: true,
    },
    // Mas Dimas Prasetyo (Primary Volunteer Mbah Kartowijoyo)
    {
      id: crypto.randomUUID(),
      elderlyId: ELD_KARTOWIJOYO_ID,
      volunteerId: VOL_DIMAS_ID,
      isPrimary: true,
    },
  ]);
}
