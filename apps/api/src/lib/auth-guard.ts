import { HTTPException } from "hono/http-exception";
import type { Context } from "hono";
import type { UserRole } from "@kabarin/types";
import type { AuthSession } from "@kabarin/auth";
import type { AppEnv } from "../types/app-env";

/**
 * Asserts that the incoming request has a valid session and matching user role.
 */
export function assertRole(
  c: Context<AppEnv>,
  ...allowedRoles: UserRole[]
): AuthSession {
  const session = c.get("session");
  if (!session) {
    throw new HTTPException(401, {
      message: "Unauthorized: Silakan login terlebih dahulu",
    });
  }

  const role = (session.user.role as UserRole) ?? "cadre";
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    throw new HTTPException(403, {
      message: `Akses ditolak: Hanya peran [${allowedRoles.join(", ")}] yang diizinkan`,
    });
  }

  return session;
}

/**
 * Asserts that the authenticated session is linked to a community RT unit.
 */
export function assertCommunity(session: AuthSession): string {
  const communityUnitId = session.user.communityUnitId;
  if (!communityUnitId) {
    throw new HTTPException(403, {
      message: "Akun Anda belum terhubung ke wilayah RT manapun",
    });
  }
  return communityUnitId;
}

