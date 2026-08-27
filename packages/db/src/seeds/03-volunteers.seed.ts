import type { AppDatabase } from "../create-db";
import { volunteers } from "../schema";
import { COMMUNITY_RT01_ID, VOL_DIMAS_ID, VOL_WAHYU_ID } from "./constants";

export async function seedVolunteers(db: AppDatabase, authUsers: Record<string, any>) {
  await db.insert(volunteers).values([
    {
      id: VOL_DIMAS_ID,
      communityUnitId: COMMUNITY_RT01_ID,
      userId: authUsers["relawan@gmail.com"]?.id ?? null,
      name: "Mas Dimas Prasetyo",
      phone: "082133445566",
      address: "Jl. Kalpataru No. 47",
      rt: "01",
      rw: "10",
      latitude: -7.9482,
      longitude: 112.6241,
      maxCapacity: 3,
      isActive: true,
    },
    {
      id: VOL_WAHYU_ID,
      communityUnitId: COMMUNITY_RT01_ID,
      userId: authUsers["relawan2@gmail.com"]?.id ?? null,
      name: "Mas Dimas Wahyu",
      phone: "082199887766",
      address: "Jl. Kalpataru No. 52",
      rt: "01",
      rw: "10",
      latitude: -7.9489,
      longitude: 112.625,
      maxCapacity: 3,
      isActive: true,
    },
  ]);
}
