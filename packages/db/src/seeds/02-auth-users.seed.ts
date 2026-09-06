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
      phone: "081330964079",
    },
    {
      email: "relawan@gmail.com",
      password: "Kabarin2026!",
      name: "Mas Dimas Prasetyo",
      role: "volunteer" as const,
      communityUnitId: COMMUNITY_RT01_ID,
      phone: "087847512517",
    },
    {
      email: "keluarga@gmail.com",
      password: "Kabarin2026!",
      name: "Budi Hidayat",
      role: "family" as const,
      communityUnitId: COMMUNITY_RT01_ID,
      phone: "085840625208",
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
