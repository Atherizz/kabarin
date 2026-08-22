import type { AppDatabase } from "../create-db";
import { user } from "../schema";
import { COMMUNITY_RT01_ID } from "./constants";

export async function seedAuthUsers(auth: any, db: AppDatabase) {
  const usersToSeed = [
    {
      email: "kader@gmail.com",
      password: "Kabarin2026!",
      name: "Ibu Endang Astuti",
      role: "cadre" as const,
      communityUnitId: COMMUNITY_RT01_ID,
      phone: "081234567890",
    },
    {
      email: "relawan@gmail.com",
      password: "Kabarin2026!",
      name: "Mas Dimas Prasetyo",
      role: "volunteer" as const,
      communityUnitId: COMMUNITY_RT01_ID,
      phone: "082133445566",
    },
    {
      email: "relawan2@gmail.com",
      password: "Kabarin2026!",
      name: "Mas Dimas Wahyu",
      role: "volunteer" as const,
      communityUnitId: COMMUNITY_RT01_ID,
      phone: "082199887766",
    },
    {
      email: "keluarga@gmail.com",
      password: "Kabarin2026!",
      name: "Budi Hidayat",
      role: "family" as const,
      communityUnitId: COMMUNITY_RT01_ID,
      phone: "081234567899",
    },
    {
      email: "keluarga2@gmail.com",
      password: "Kabarin2026!",
      name: "Rian Hidayat",
      role: "family" as const,
      communityUnitId: COMMUNITY_RT01_ID,
      phone: "081288990011",
    },
  ];

  const createdAuthUsers: Record<string, any> = {};

  for (const u of usersToSeed) {
    const res = await auth.api.signUpEmail({
      body: {
        email: u.email,
        password: u.password,
        name: u.name,
        role: u.role,
        communityUnitId: u.communityUnitId,
        phone: u.phone,
      },
    });
    createdAuthUsers[u.email] = res.user;
  }

  // Mark all emails as verified immediately for easy testing
  await db.update(user).set({ emailVerified: true });

  return createdAuthUsers;
}
