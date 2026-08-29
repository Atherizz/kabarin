import type { AppDatabase } from "@kabarin/db";
import { eq, and, elderly, volunteerVisits, elderlyVolunteers, volunteers } from "@kabarin/db";
import type { CreateVolunteerVisitInput, GuidedChecklistItem } from "@kabarin/types";
import { buildFallbackChecklist } from "../ai/checklist-service";
import { generateAccessToken } from "../token";

export class VolunteerNotFoundError extends Error {
  constructor() { super("Relawan tidak ditemukan di RT ini"); }
}

export class VolunteerInactiveError extends Error {
  constructor() { super("Relawan ini berstatus non-aktif dan tidak dapat menerima tugas kunjungan"); }
}

/**
 * Core visit dispatch logic — reused by both the REST endpoint (cadre manual)
 * and the WhatsApp bot (automated tier-1 escalation dispatch).
 *
 * Does NOT perform auth/ownership checks — callers are responsible for that.
 * Reads defaultChecklist cached on the elderly record (no AI call at dispatch time).
 */
export async function createVisit(
  db: AppDatabase,
  params: CreateVolunteerVisitInput & {
    communityUnitId: string;
    /** Link to the escalation that triggered this visit (bot tier-1 dispatch) */
    escalationLogId?: string | null;
  }
) {
  const { elderlyId, communityUnitId, visitType = "routine", notes, escalationLogId } = params;

  // 1. Resolve volunteer
  let assignedVolunteerId: string | null = null;

  if (params.volunteerId) {
    const vol = await db.query.volunteers.findFirst({
      where: and(
        eq(volunteers.id, params.volunteerId),
        eq(volunteers.communityUnitId, communityUnitId)
      ),
    });

    if (!vol) throw new VolunteerNotFoundError();
    if (!vol.isActive) throw new VolunteerInactiveError();

    assignedVolunteerId = vol.id;
  } else {
    // Auto-assign primary responder
    const primaryAssignment = await db.query.elderlyVolunteers.findFirst({
      where: and(
        eq(elderlyVolunteers.elderlyId, elderlyId),
        eq(elderlyVolunteers.isPrimary, true)
      ),
      with: { volunteer: true },
    });

    if (primaryAssignment?.volunteer?.isActive) {
      assignedVolunteerId = primaryAssignment.volunteerId;
    }
  }

  // 2. Read cached checklist from elderly profile — no AI call at dispatch time
  const elderlyRecord = await db.query.elderly.findFirst({
    where: eq(elderly.id, elderlyId),
    columns: { defaultChecklist: true },
  });
  const guidedChecklist = (elderlyRecord?.defaultChecklist as GuidedChecklistItem[] | null) ?? buildFallbackChecklist();

  // 3. Insert visit record with token valid 24 hours
  const visitId = crypto.randomUUID();
  const formToken = generateAccessToken();
  const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const [createdVisit] = await db
    .insert(volunteerVisits)
    .values({
      id: visitId,
      communityUnitId,
      elderlyId,
      volunteerId: assignedVolunteerId,
      visitType,
      formToken,
      tokenExpiresAt,
      status: "pending",
      volunteerNotes: notes ?? null,
      escalationLogId: escalationLogId ?? null,
      guidedChecklist,
    })
    .returning();

  return createdVisit;
}
