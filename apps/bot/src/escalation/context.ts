import type { WASocket } from "@whiskeysockets/baileys";
import type { AppDatabase } from "@kabarin/db";
import { eq, and, elderly, escalationLogs } from "@kabarin/db";
import type { EscalationTier } from "@kabarin/types";

export interface DispatchEscalationParams {
  db: AppDatabase;
  sock: WASocket;
  elderlyId: string;
  tier: EscalationTier;
  reason: string;
  checkinSessionId?: string | null;
  triggeredBy?: "ai_triage" | "no_response" | "family_sos" | "manual";
}

export interface VolunteerInfo {
  id: string;
  name: string;
  phone: string;
}

export interface FamilyInfo {
  id: string;
  name: string;
  phone: string;
  accessToken: string;
  notifyViaWhatsapp: boolean;
  isPrimaryContact: boolean;
}

export interface EscalationContext {
  db: AppDatabase;
  sock: WASocket;
  tier: EscalationTier;
  reason: string;
  checkinSessionId?: string | null;
  triggeredBy: string;
  now: Date;
  nowIso: string;
  appBaseUrl: string;
  communityUnitId: string;
  elderly: {
    id: string;
    name: string;
    address: string;
    rt: string;
    rw: string;
    defaultChecklist: unknown;
  };
  primaryVol?: VolunteerInfo;
  secondaryVol?: VolunteerInfo;
  primaryFamily?: FamilyInfo;
  otherFamilies: FamilyInfo[];
}

export function generate64HexToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function buildEscalationContext(
  params: DispatchEscalationParams
): Promise<EscalationContext | null> {
  const { db, sock, elderlyId, tier, reason, checkinSessionId, triggeredBy = "ai_triage" } = params;

  const record = await db.query.elderly.findFirst({
    where: eq(elderly.id, elderlyId),
    with: {
      volunteerAssignments: { with: { volunteer: true } },
      familyMembers: true,
    },
  });

  if (!record) {
    console.error(`[escalation] Elderly ID ${elderlyId} not found`);
    return null;
  }

  const primaryAssign =
    record.volunteerAssignments.find((a) => a.isPrimary) ??
    record.volunteerAssignments[0];
  const secondaryAssign = record.volunteerAssignments.find((a) => !a.isPrimary);

  const primaryFam =
    record.familyMembers.find((f) => f.isPrimaryContact) ??
    record.familyMembers[0];

  const now = new Date();

  return {
    db,
    sock,
    tier,
    reason,
    checkinSessionId,
    triggeredBy,
    now,
    nowIso: now.toISOString(),
    appBaseUrl: process.env.APP_BASE_URL || "https://kabarin.pages.dev",
    communityUnitId: record.communityUnitId,
    elderly: {
      id: record.id,
      name: record.name,
      address: record.address,
      rt: record.rt,
      rw: record.rw,
      defaultChecklist: record.defaultChecklist,
    },
    primaryVol: primaryAssign?.volunteer
      ? {
          id: primaryAssign.volunteer.id,
          name: primaryAssign.volunteer.name,
          phone: primaryAssign.volunteer.phone,
        }
      : undefined,
    secondaryVol: secondaryAssign?.volunteer
      ? {
          id: secondaryAssign.volunteer.id,
          name: secondaryAssign.volunteer.name,
          phone: secondaryAssign.volunteer.phone,
        }
      : undefined,
    primaryFamily: primaryFam
      ? {
          id: primaryFam.id,
          name: primaryFam.name,
          phone: primaryFam.phone,
          accessToken: primaryFam.accessToken,
          notifyViaWhatsapp: primaryFam.notifyViaWhatsapp,
          isPrimaryContact: primaryFam.isPrimaryContact,
        }
      : undefined,
    otherFamilies: record.familyMembers.filter((f) => f.id !== primaryFam?.id),
  };
}

export async function updateElderlyStatus(ctx: EscalationContext): Promise<void> {
  const newStatus = ctx.tier === 3 ? "red" : "yellow";
  await ctx.db
    .update(elderly)
    .set({
      currentStatus: newStatus,
      notes: ctx.reason,
      updatedAt: ctx.now,
    })
    .where(eq(elderly.id, ctx.elderly.id));
}

export async function recordEscalationLog(ctx: EscalationContext): Promise<void> {
  const { db, elderly, communityUnitId, tier, reason, triggeredBy, now, nowIso, primaryVol } = ctx;

  const active = await db.query.escalationLogs.findFirst({
    where: and(
      eq(escalationLogs.elderlyId, elderly.id),
      eq(escalationLogs.status, "open")
    ),
  });

  const tierHistoryItem = {
    tier,
    action: `tier_${tier}_dispatched`,
    targetType: tier === 1 ? ("volunteer" as const) : tier === 2 ? ("family" as const) : ("broadcast" as const),
    targetId: primaryVol?.id ?? null,
    targetName: primaryVol?.name ?? null,
    targetPhone: primaryVol?.phone ?? null,
    note: reason,
    timestamp: nowIso,
  };

  if (!active) {
    await db.insert(escalationLogs).values({
      id: crypto.randomUUID(),
      communityUnitId,
      elderlyId: elderly.id,
      checkinSessionId: ctx.checkinSessionId ?? null,
      tier,
      triggerReason: triggeredBy,
      status: "open",
      tierHistory: [tierHistoryItem],
      familyNotifiedAt: tier >= 2 ? now : null,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    const history = active.tierHistory ?? [];
    await db
      .update(escalationLogs)
      .set({
        tier: Math.max(active.tier, tier),
        tierHistory: [...history, tierHistoryItem],
        familyNotifiedAt: tier >= 2 ? now : active.familyNotifiedAt,
        updatedAt: now,
      })
      .where(eq(escalationLogs.id, active.id));
  }
}
