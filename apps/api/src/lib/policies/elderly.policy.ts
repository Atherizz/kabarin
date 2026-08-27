import { HTTPException } from "hono/http-exception";
import type { UserRole } from "@kabarin/types";
import type { AuthSession } from "@kabarin/auth";
import {
  elderly,
  elderlyFamily,
  elderlyVolunteers,
  volunteers,
  eq,
  and,
  or,
  type AppDatabase,
} from "@kabarin/db";
import { assertCommunity } from "../auth-guard";

type PolicyHandler = (
  db: AppDatabase,
  session: AuthSession,
  elderlyId: string
) => Promise<any>;

async function assertAdminAccess(
  db: AppDatabase,
  session: AuthSession,
  elderlyId: string
) {
  const record = await db.query.elderly.findFirst({
    where: eq(elderly.id, elderlyId),
  });

  if (!record) {
    throw new HTTPException(404, { message: "Data lansia tidak ditemukan" });
  }

  return record;
}

async function assertCadreAccess(
  db: AppDatabase,
  session: AuthSession,
  elderlyId: string
) {
  const communityUnitId = assertCommunity(session);
  const record = await db.query.elderly.findFirst({
    where: and(eq(elderly.id, elderlyId), eq(elderly.communityUnitId, communityUnitId)),
  });

  if (!record) {
    throw new HTTPException(404, { message: "Data lansia tidak ditemukan di RT ini" });
  }

  return record;
}


async function assertFamilyAccess(
  db: AppDatabase,
  session: AuthSession,
  elderlyId: string
) {
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


async function assertVolunteerAccess(
  db: AppDatabase,
  session: AuthSession,
  elderlyId: string
) {
  const volunteer = await db.query.volunteers.findFirst({
    where: eq(volunteers.userId, session.user.id),
  });

  if (!volunteer) {
    throw new HTTPException(403, {
      message: "Akses ditolak: Profil relawan tidak ditemukan",
    });
  }

  const assignment = await db.query.elderlyVolunteers.findFirst({
    where: and(
      eq(elderlyVolunteers.elderlyId, elderlyId),
      eq(elderlyVolunteers.volunteerId, volunteer.id)
    ),
    with: {
      elderly: true,
    },
  });

  if (!assignment || !assignment.elderly) {
    throw new HTTPException(403, {
      message: "Akses ditolak: Anda bukan relawan yang ditugaskan untuk lansia ini",
    });
  }

  return assignment.elderly;
}


const ROLE_POLICY_HANDLERS: Partial<Record<UserRole, PolicyHandler>> = {
  admin: assertAdminAccess,
  cadre: assertCadreAccess,
  family: assertFamilyAccess,
  volunteer: assertVolunteerAccess,
};

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
  const userRole = (session.user.role as UserRole) ?? "family";
  const handler = ROLE_POLICY_HANDLERS[userRole];

  if (!handler) {
    throw new HTTPException(403, {
      message: "Akses ditolak: Peran Anda tidak memiliki izin untuk mengelola lansia ini",
    });
  }

  return handler(db, session, elderlyId);
}
