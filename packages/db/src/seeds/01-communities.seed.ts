import type { AppDatabase } from "../create-db";
import { communityUnits } from "../schema";
import { COMMUNITY_RT01_ID, COMMUNITY_RT02_ID } from "./constants";

export async function seedCommunities(db: AppDatabase) {
  await db.insert(communityUnits).values([
    {
      id: COMMUNITY_RT01_ID,
      code: "3573051007-RW10-RT01",
      name: "RT 01 / RW 10, Kel. Jatimulyo",
      province: "Jawa Timur",
      city: "Kota Malang",
      district: "Lowokwaru",
      subdistrict: "Jatimulyo",
      subdistrictCode: "3573051007",
      rw: "10",
      rt: "01",
      healthFacilityName: "Puskesmas Kendalsari",
      healthFacilityPhone: "0341491122",
      communityHealthWorkerPhone: null,
      ambulancePhone: "119",
    },
    {
      id: COMMUNITY_RT02_ID,
      code: "3573051007-RW10-RT02",
      name: "RT 02 / RW 10, Kel. Jatimulyo",
      province: "Jawa Timur",
      city: "Kota Malang",
      district: "Lowokwaru",
      subdistrict: "Jatimulyo",
      subdistrictCode: "3573051007",
      rw: "10",
      rt: "02",
      healthFacilityName: "Puskesmas Kendalsari",
      healthFacilityPhone: "0341491122",
      communityHealthWorkerPhone: null,
      ambulancePhone: "119",
    },
  ]);
}
