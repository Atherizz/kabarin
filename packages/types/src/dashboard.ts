import { z } from "./zod-extended";

export const DashboardStatsSchema = z
  .object({
    community: z.object({
      id: z.string(),
      code: z.string(),
      name: z.string(),
      rt: z.string(),
      rw: z.string(),
      subdistrict: z.string(),
      district: z.string(),
      city: z.string(),
    }),
    elderly: z.object({
      total: z.number().describe("Total registered seniors in the RT territory"),
      verified: z.number().describe("Total approved/verified seniors"),
      pendingVerification: z
        .number()
        .describe("Seniors registered bottom-up awaiting Cadre approval"),
      highRiskCount: z
        .number()
        .describe("Number of high-risk seniors with riskScore >= 70"),
      statusBreakdown: z.object({
        green: z.number().describe("Safe and stable seniors (Green)"),
        yellow: z.number().describe("Seniors needing monitoring/unwell (Yellow)"),
        red: z.number().describe("Seniors in emergency condition (Red)"),
        grey: z.number().describe("Inactive/out-of-town seniors (Grey)"),
      }),
      mobilityBreakdown: z.object({
        independent: z.number().describe("Independently mobile seniors"),
        needs_assistance: z
          .number()
          .describe("Seniors requiring partial assistance"),
        homebound: z.number().describe("Homebound / immobile seniors"),
      }),
    }),
    todayCheckins: z.object({
      date: z.string().describe("Current check-in date in YYYY-MM-DD format"),
      totalScheduled: z.number().describe("Total active seniors scheduled for check-in today"),
      sent: z.number().describe("Total greetings dispatched to WhatsApp"),
      replied: z.number().describe("Seniors who have safely responded"),
      pending: z.number().describe("Seniors currently in the 90-minute grace period"),
      escalated: z.number().describe("Seniors flagged for intervention"),
      responseRate: z.number().describe("Response rate percentage (0 - 100%)"),
    }),
    volunteers: z.object({
      total: z.number().describe("Total neighborhood volunteers registered in the RT"),
      active: z.number().describe("Total active volunteers available for duty"),
      totalAssignedElderly: z
        .number()
        .describe("Total seniors currently assigned to volunteers"),
      ratio: z
        .string()
        .describe("Volunteer-to-elderly care ratio (e.g. '1 : 2.4')"),
    }),
    medications: z.object({
      totalActiveMedications: z
        .number()
        .describe("Total active daily prescription schedules monitored across RT"),
    }),
    actionItems: z.object({
      openEscalations: z
        .number()
        .describe("Number of active emergency incidents requiring attention"),
      pendingVerifications: z
        .number()
        .describe("Number of bottom-up elderly registrations awaiting verification"),
      pendingVisits: z
        .number()
        .describe("Number of physical visit tasks awaiting volunteer field reports"),
    }),
  })
  .openapi({
    example: {
      community: {
        id: "cmm_3573051007_rw10_rt01",
        code: "3573051007-RW10-RT01",
        name: "RT 01 / RW 10 Kelurahan Lowokwaru",
        rt: "01",
        rw: "10",
        subdistrict: "Lowokwaru",
        district: "Lowokwaru",
        city: "Kota Malang",
      },
      elderly: {
        total: 12,
        verified: 11,
        pendingVerification: 1,
        highRiskCount: 3,
        statusBreakdown: {
          green: 8,
          yellow: 2,
          red: 1,
          grey: 1,
        },
        mobilityBreakdown: {
          independent: 7,
          needs_assistance: 3,
          homebound: 2,
        },
      },
      todayCheckins: {
        date: "2026-08-22",
        totalScheduled: 11,
        sent: 11,
        replied: 9,
        pending: 1,
        escalated: 1,
        responseRate: 81.8,
      },
      volunteers: {
        total: 5,
        active: 5,
        totalAssignedElderly: 11,
        ratio: "1 : 2.2",
      },
      medications: {
        totalActiveMedications: 18,
      },
      actionItems: {
        openEscalations: 1,
        pendingVerifications: 1,
        pendingVisits: 2,
      },
    },
  });

export type DashboardStats = z.infer<typeof DashboardStatsSchema>;

// ─── Daily Operational Briefing ───────────────────────────────────────────────

export const ActionItemSchema = z.object({
  type: z.enum([
    "missed_checkin",
    "open_escalation",
    "pending_verification",
    "pending_visit",
    "high_risk",
  ]),
  label: z.string().describe("Human-readable action description for cadre"),
  elderlyId: z.string().nullable().describe("Associated elderly ID, null if RT-level"),
  elderlyName: z.string().nullable().describe("Associated elderly name"),
  priority: z.enum(["urgent", "normal"]),
});

export const BriefingResponseSchema = z
  .object({
    generatedAt: z.string().datetime().describe("Timestamp when this briefing was generated"),
    summary: z.string().describe("AI-generated natural language briefing paragraph for cadre"),
    actionItems: z.array(ActionItemSchema).describe("Sorted list of action items requiring cadre attention today"),
    stats: z.object({
      missedCheckins: z.number(),
      openEscalations: z.number(),
      pendingVerifications: z.number(),
      pendingVisits: z.number(),
      highRiskCount: z.number(),
    }),
  })
  .openapi({
    example: {
      generatedAt: "2026-08-28T00:05:00.000Z",
      summary:
        "Selamat pagi Bu Endang! Hari ini ada 2 lansia yang belum membalas sapaan pagi: Mbah Sumo (Jl. Mawar 12) dan Bu Siti (Jl. Melati 4). Terdapat 1 eskalasi aktif yang perlu ditangani segera. Selain itu, ada 1 warga baru yang didaftarkan oleh keluarganya dan menunggu verifikasi RT.",
      actionItems: [
        {
          type: "missed_checkin",
          label: "Mbah Sumo belum membalas sapaan pagi",
          elderlyId: "eld_uuid_sumo",
          elderlyName: "Mbah Sumo",
          priority: "urgent",
        },
        {
          type: "pending_verification",
          label: "Bu Siti (Jl. Melati 4) menunggu verifikasi RT",
          elderlyId: "eld_uuid_siti",
          elderlyName: "Bu Siti",
          priority: "normal",
        },
      ],
      stats: {
        missedCheckins: 2,
        openEscalations: 1,
        pendingVerifications: 1,
        pendingVisits: 2,
        highRiskCount: 3,
      },
    },
  });

export type ActionItem = z.infer<typeof ActionItemSchema>;
export type BriefingResponse = z.infer<typeof BriefingResponseSchema>;

// ─── Volunteer Proximity Recommendations ──────────────────────────────────────

export const VolunteerRecommendationSchema = z
  .object({
    volunteerId: z.string(),
    name: z.string(),
    phone: z.string(),
    address: z.string(),
    distanceMeters: z.number().describe("Straight-line distance from elderly home (meters)"),
    activeBinaan: z.number().describe("Current number of assigned elderly (active load)"),
    maxCapacity: z.number().describe("Maximum elderly this volunteer can handle"),
    availableSlots: z.number().describe("maxCapacity - activeBinaan"),
    isRecommended: z.boolean().describe("True if distance < 100m AND activeBinaan < maxCapacity"),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
  })
  .openapi({
    example: {
      volunteerId: "vol_uuid_budi",
      name: "Mas Budi Santoso",
      phone: "082133445566",
      address: "Jl. Kalpataru No. 47",
      distanceMeters: 28.5,
      activeBinaan: 2,
      maxCapacity: 5,
      availableSlots: 3,
      isRecommended: true,
      latitude: -7.9479,
      longitude: 112.6241,
    },
  });

export type VolunteerRecommendation = z.infer<typeof VolunteerRecommendationSchema>;
