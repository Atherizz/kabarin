import { HTTPException } from "hono/http-exception";
import type { UserRole } from "@kabarin/types";
import type { AuthSession } from "@kabarin/auth";
import { elderly, elderlyFamily, eq, and, or, type AppDatabase } from "@kabarin/db";
import { assertCommunity } from "../auth-guard";

/**
 * @throws HTTPException(404) if the elderly does not exist in the tenant scope.
 * @throws HTTPException(403) if the authenticated user has no relationship or permission.
 * @returns The resolved elderly record on success.
 */
export async function assertElderlyAccess(
  db: AppDatabase,
  session: AuthSession,
  elderlyId: string
) {
  const userRole = (session.user.role as UserRole) ?? "cadre";

  // 1. Admin bypass
  if (userRole === "admin") {
    const record = await db.query.elderly.findFirst({
      where: eq(elderly.id, elderlyId),
    });
    if (!record) {
      throw new HTTPException(404, { message: "Data lansia tidak ditemukan" });
    }
    return record;
  }

  // 2. Cadre — Multi-tenant boundary check (must belong to cadre's RT)
  if (userRole === "cadre") {
    const communityUnitId = assertCommunity(session);
    const record = await db.query.elderly.findFirst({
      where: and(eq(elderly.id, elderlyId), eq(elderly.communityUnitId, communityUnitId)),
    });
    if (!record) {
      throw new HTTPException(404, { message: "Data lansia tidak ditemukan di RT ini" });
    }
    return record;
  }

  // 3. Family — Relationship boundary check (must be registered family contact)
  if (userRole === "family") {
    const familyMember = await db.query.elderlyFamily.findFirst({
      where: and(
        eq(elderlyFamily.elderlyId, elderlyId),
        session.user.phone
          ? or(
              eq(elderlyFamily.userId, session.user.id),
              eq(elderlyFamily.phone, session.user.phone)
            )
          : eq(elderlyFamily.userId, session.user.id)
      ),
      with: {
        elderly: true,
      },
    });

    if (!familyMember || !familyMember.elderly) {
      throw new HTTPException(403, {
        message: "Akses ditolak: Anda bukan kontak keluarga yang terdaftar untuk lansia ini",
      });
    }

    return familyMember.elderly;
  }

  throw new HTTPException(403, {
    message: "Akses ditolak: Peran Anda tidak memiliki izin untuk mengelola lansia ini",
  });
}
