import { z, ElderlyMedicationSchema } from "@kabarin/types";
import { eq, and, desc, elderly, elderlyMedications } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole, assertCommunity } from "../../lib/auth-guard";

export class ListMedicationsEndpoint extends ApiRoute {
  schema = {
    tags: ["Medication Schedules"],
    summary: "List medication schedules for an elderly",
    description: "Returns all active and inactive medication schedules configured for a specific elderly individual in the cadre's RT.",
    request: {
      params: z.object({
        id: z.string(),
      }),
    },
    responses: {
      "200": {
        description: "List of medication schedules",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: z.array(ElderlyMedicationSchema),
            }),
          },
        },
      },
      "404": {
        description: "Elderly not found in this RT",
        content: {
          "application/json": {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
      },
    },
  };

  async handle(c: Context<AppEnv>) {
    const session = assertRole(c, "cadre", "admin");
    const communityUnitId = assertCommunity(session);
    const db = c.get("db");

    const { id: elderlyId } = c.req.param();

    // 1. Verify elderly belongs to the cadre's RT
    const elderlyRecord = await db.query.elderly.findFirst({
      where: and(eq(elderly.id, elderlyId), eq(elderly.communityUnitId, communityUnitId)),
    });

    if (!elderlyRecord) {
      return c.json({ success: false, error: "Data lansia tidak ditemukan di RT ini" }, 404);
    }

    // 2. Fetch medication schedules
    const records = await db.query.elderlyMedications.findMany({
      where: eq(elderlyMedications.elderlyId, elderlyId),
      orderBy: [desc(elderlyMedications.isActive), desc(elderlyMedications.createdAt)],
    });

    const data = records.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    }));

    return c.json({ success: true, data });
  }
}
