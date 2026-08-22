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
  const tokenAminahFamily = generateSecureHexToken();
  const tokenKartowijoyoFamily = generateSecureHexToken();

  await db.insert(elderlyFamily).values([
    {
      id: FAM_BUDI_ID,
      elderlyId: ELD_SOEPARDI_ID,
      userId: authUsers["keluarga@gmail.com"]?.id,
      name: "Budi Hidayat",
      phone: "081234567899",
      relationship: "child",
      isPrimaryContact: true,
      accessToken: tokenSoepardiFamily,
      notifyViaWhatsapp: true,
    },
    {
      id: FAM_RAHMA_ID,
      elderlyId: ELD_SOEPARDI_ID,
      userId: null,
      name: "Siti Rahma",
      phone: "081299887722",
      relationship: "child",
      isPrimaryContact: false,
      accessToken: generateSecureHexToken(),
      notifyViaWhatsapp: true,
    },
    {
      id: FAM_RIAN_ID,
      elderlyId: ELD_AMINAH_ID,
      userId: authUsers["keluarga2@gmail.com"]?.id,
      name: "Rian Hidayat",
      phone: "081288990011",
      relationship: "child",
      isPrimaryContact: true,
      accessToken: tokenAminahFamily,
      notifyViaWhatsapp: true,
    },
    {
      id: FAM_AGUS_ID,
      elderlyId: ELD_KARTOWIJOYO_ID,
      userId: null,
      name: "Agus Kartowijoyo",
      phone: "081277665544",
      relationship: "child",
      isPrimaryContact: true,
      accessToken: tokenKartowijoyoFamily,
      notifyViaWhatsapp: true,
    },
  ]);

  return {
    tokenSoepardiFamily,
    tokenAminahFamily,
    tokenKartowijoyoFamily,
  };
}
