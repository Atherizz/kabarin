import type { AppDatabase } from "../create-db";
import { elderlyFamily } from "../schema";
import {
  ELD_SOEPARDI_ID,
  ELD_AMINAH_ID,
  ELD_KARTOWIJOYO_ID,
  FAM_BUDI_ID,
  FAM_RAHMA_ID,
  FAM_RIAN_ID,
  FAM_AGUS_ID,
  generateSecureHexToken,
} from "./constants";

export async function seedFamily(db: AppDatabase, authUsers: Record<string, any>) {
  const tokenSoepardiFamily = generateSecureHexToken();
  const tokenRahmaFamily = generateSecureHexToken();
  const tokenRianFamily = generateSecureHexToken();

  await db.insert(elderlyFamily).values([
    {
      id: FAM_BUDI_ID,
      elderlyId: ELD_SOEPARDI_ID,
      userId: authUsers["keluarga@gmail.com"]?.id,
      name: "Budi Hidayat",
      phone: "085840625208",
      relationship: "child",
      isPrimaryContact: true,
      accessToken: tokenSoepardiFamily,
      notifyViaWhatsapp: true,
    },
    {
      id: FAM_RAHMA_ID,
      elderlyId: ELD_SOEPARDI_ID,
      userId: authUsers["keluarga2@gmail.com"]?.id,
      name: "Siti Rahma",
      phone: "088237348303",
      relationship: "child",
      isPrimaryContact: false,
      accessToken: tokenRahmaFamily,
      notifyViaWhatsapp: true,
    },
    {
      id: FAM_RIAN_ID,
      elderlyId: ELD_SOEPARDI_ID,
      userId: authUsers["keluarga3@gmail.com"]?.id,
      name: "Rian Hidayat",
      phone: "085738183231",
      relationship: "child",
      isPrimaryContact: false,
      accessToken: tokenRianFamily,
      notifyViaWhatsapp: true,
    },
  ]);

  return {
    tokenSoepardiFamily,
    tokenRahmaFamily,
    tokenRianFamily,
  };
}
