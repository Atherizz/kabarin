import { z, DashboardStatsSchema } from "@kabarin/types";
import {
  eq,
  and,
  communityUnits,
  elderly,
  checkinSessions,
  volunteers,
  elderlyVolunteers,
  escalationLogs,
  volunteerVisits,
  elderlyMedications,
  inArray,
} from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole, assertCommunity } from "../../lib/auth-guard";

export class GetDashboardStatsEndpoint extends ApiRoute {
  schema = {
    tags: ["Community & Dashboard"],
    summary: "Get aggregated neighborhood triage dashboard statistics",
    description:
      "Returns comprehensive, real-time aggregated metrics and triage statistics across the RT neighborhood (Surface 1: Cadre RT Home Dashboard).\n\n" +
      "### Metrics Aggregated:\n" +
      "- **Elderly Welfare:** Total registered, traffic-light breakdown (Green/Yellow/Red/Grey), mobility breakdown, and high-risk count (`riskScore >= 70`).\n" +
      "- **Daily Check-ins:** Today's WhatsApp greeting completion and real-time response rate percentage.\n" +
      "- **Volunteer Workforce:** Total active volunteers and caregiver-to-senior care ratio.\n" +
      "- **Action Items:** Pending bottom-up verification approvals, open emergency escalations, and unfulfilled visit tasks.",
    responses: {
      "200": {
        description: "Aggregated neighborhood triage metrics",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: DashboardStatsSchema,
            }),
          },
        },
      },
    },
  };

  async handle(c: Context<AppEnv>) {
    const session = assertRole(c, "cadre", "admin");
    const communityUnitId = assertCommunity(session);
    const db = c.get("db");

    const todayStr = new Date().toISOString().split("T")[0];

    const [
      communityRecord,
      elderlyRecords,
      checkinRecords,
      volunteerRecords,
      openEscalations,
      pendingVisits,
    ] = await Promise.all([
      db.query.communityUnits.findFirst({
        where: eq(communityUnits.id, communityUnitId),
      }),
      db.query.elderly.findMany({
        where: eq(elderly.communityUnitId, communityUnitId),
      }),
      db.query.checkinSessions.findMany({
        where: and(
          eq(checkinSessions.communityUnitId, communityUnitId),
          eq(checkinSessions.sessionDate, todayStr)
        ),
      }),
      db.query.volunteers.findMany({
        where: eq(volunteers.communityUnitId, communityUnitId),
      }),
      db.query.escalationLogs.findMany({
        where: and(
          eq(escalationLogs.communityUnitId, communityUnitId),
          eq(escalationLogs.status, "open")
        ),
      }),
      db.query.volunteerVisits.findMany({
        where: and(
          eq(volunteerVisits.communityUnitId, communityUnitId),
          eq(volunteerVisits.status, "pending")
        ),
      }),
    ]);

    const elderlyIds = elderlyRecords.map((e) => e.id);

    // Fetch medication and volunteer assignment counts
    const [medicationRecords, assignmentRecords] = await Promise.all([
      elderlyIds.length > 0
        ? db.query.elderlyMedications.findMany({
            where: and(
              inArray(elderlyMedications.elderlyId, elderlyIds),
              eq(elderlyMedications.isActive, true)
            ),
          })
        : Promise.resolve([]),
      elderlyIds.length > 0
        ? db.query.elderlyVolunteers.findMany({
            where: inArray(elderlyVolunteers.elderlyId, elderlyIds),
          })
        : Promise.resolve([]),
    ]);

    // Compute Elderly Stats
    const totalElderly = elderlyRecords.length;
    const verifiedElderly = elderlyRecords.filter(
      (e) => e.verificationStatus === "verified"
    ).length;
    const pendingVerification = elderlyRecords.filter(
      (e) => e.verificationStatus === "pending_verification"
    ).length;
    const highRiskCount = elderlyRecords.filter((e) => (e.riskScore ?? 0) >= 70).length;

    const statusBreakdown = {
      green: elderlyRecords.filter((e) => e.currentStatus === "green").length,
      yellow: elderlyRecords.filter((e) => e.currentStatus === "yellow").length,
      red: elderlyRecords.filter((e) => e.currentStatus === "red").length,
      grey: elderlyRecords.filter((e) => e.currentStatus === "grey").length,
    };

    const mobilityBreakdown = {
      independent: elderlyRecords.filter((e) => e.mobilityStatus === "independent").length,
      needs_assistance: elderlyRecords.filter(
        (e) => e.mobilityStatus === "needs_assistance"
      ).length,
      homebound: elderlyRecords.filter(
        (e) => e.mobilityStatus === "homebound"
      ).length,
    };

    // Compute Checkin Stats
    const totalScheduled = checkinRecords.length;
    const sentCheckins = checkinRecords.filter((r) => r.status !== "pending").length;
    const repliedCheckins = checkinRecords.filter((r) => r.status === "replied").length;
    const pendingCheckins = checkinRecords.filter(
      (r) => r.status === "pending" || r.status === "sent" || r.status === "reminded"
    ).length;
    const escalatedCheckins = checkinRecords.filter((r) => r.status === "escalated").length;
    const responseRate =
      totalScheduled > 0
        ? Number(((repliedCheckins / totalScheduled) * 100).toFixed(1))
        : 0;

    // Compute Volunteer Stats
    const totalVolunteers = volunteerRecords.length;
    const activeVolunteers = volunteerRecords.filter((v) => v.isActive).length;
    const totalAssignedElderly = new Set(assignmentRecords.map((a) => a.elderlyId)).size;
    const ratioNum =
      activeVolunteers > 0
        ? (totalAssignedElderly / activeVolunteers).toFixed(1)
        : "0.0";
    const volunteerRatio = `1 : ${ratioNum}`;

    // Assemble Final Payload
    return c.json({
      success: true,
      data: {
        community: {
          id: communityRecord?.id ?? communityUnitId,
          code: communityRecord?.code ?? "",
          name: communityRecord?.name ?? "RT Territory",
          rt: communityRecord?.rt ?? "",
          rw: communityRecord?.rw ?? "",
          subdistrict: communityRecord?.subdistrict ?? "",
          district: communityRecord?.district ?? "",
          city: communityRecord?.city ?? "",
        },
        elderly: {
          total: totalElderly,
          verified: verifiedElderly,
          pendingVerification,
          highRiskCount,
          statusBreakdown,
          mobilityBreakdown,
        },
        todayCheckins: {
          date: todayStr,
          totalScheduled,
          sent: sentCheckins,
          replied: repliedCheckins,
          pending: pendingCheckins,
          escalated: escalatedCheckins,
          responseRate,
        },
        volunteers: {
          total: totalVolunteers,
          active: activeVolunteers,
          totalAssignedElderly,
          ratio: volunteerRatio,
        },
        medications: {
          totalActiveMedications: medicationRecords.length,
        },
        actionItems: {
          openEscalations: openEscalations.length,
          pendingVerifications: pendingVerification,
          pendingVisits: pendingVisits.length,
        },
      },
    });
  }
}
