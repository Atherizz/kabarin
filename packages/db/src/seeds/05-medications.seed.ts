import type { AppDatabase } from "../create-db";
import { elderlyMedications } from "../schema";
import {
  ELD_SOEPARDI_ID,
  ELD_AMINAH_ID,
  ELD_KARTOWIJOYO_ID,
  ELD_DJOJODIGDO_ID,
  MED_AMLODIPINE_ID,
  MED_METFORMIN_ID,
  MED_CANDESARTAN_ID,
  MED_ALLOPURINOL_ID,
} from "./constants";

export async function seedMedications(db: AppDatabase) {
  await db.insert(elderlyMedications).values([
    {
      id: MED_AMLODIPINE_ID,
      elderlyId: ELD_SOEPARDI_ID,
      conditionName: "Hipertensi",
      medicationName: "Amlodipine 5mg",
      dosage: "1 tablet",
      frequency: "1x sehari",
      timeOfDay: "morning",
      timingInstruction: "after_meal",
      reminderTime: "07:00",
      notes: "Diminum rutin setelah sarapan pagi.",
      isActive: true,
    },
    {
      id: MED_METFORMIN_ID,
      elderlyId: ELD_AMINAH_ID,
      conditionName: "Diabetes",
      medicationName: "Metformin 500mg",
      dosage: "1 tablet",
      frequency: "2x sehari",
      timeOfDay: "morning",
      timingInstruction: "after_meal",
      reminderTime: "07:00",
      notes: "Diminum setelah sarapan pagi.",
      isActive: true,
    },
    {
      id: MED_CANDESARTAN_ID,
      elderlyId: ELD_KARTOWIJOYO_ID,
      conditionName: "Jantung & Hipertensi",
      medicationName: "Candesartan 8mg",
      dosage: "1 tablet",
      frequency: "1x sehari",
      timeOfDay: "evening",
      timingInstruction: "after_meal",
      reminderTime: "19:00",
      notes: "Diminum malam hari sebelum tidur.",
      isActive: true,
    },
    {
      id: MED_ALLOPURINOL_ID,
      elderlyId: ELD_DJOJODIGDO_ID,
      conditionName: "Asam Urat",
      medicationName: "Allopurinol 100mg",
      dosage: "1 tablet",
      frequency: "1x sehari",
      timeOfDay: "morning",
      timingInstruction: "after_meal",
      reminderTime: "07:00",
      notes: "Diminum pagi setelah makan.",
      isActive: true,
    },
  ]);
}
