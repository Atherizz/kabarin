import type { AppDatabase } from "../create-db";
import { elderlyFamily } from "../schema";
import {
  ELD_SOEPARDI_ID,
  FAM_BUDI_ID,
  generateSecureHexToken,
} from "./constants";

export async function seedFamily(db: AppDatabase, authUsers: Record<string, any>) {
  const tokenSoepardiFamily = generateSecureHexToken();

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
  ]);

  return {
    tokenSoepardiFamily,
  };
}
