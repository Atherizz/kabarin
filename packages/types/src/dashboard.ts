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
