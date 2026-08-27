import { z, ElderlyMedicationSchema } from "@kabarin/types";
import { eq, desc, elderlyMedications } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole } from "../../lib/auth-guard";
import { assertElderlyAccess } from "../../lib/policies/elderly.policy";

export class ListMedicationsEndpoint extends ApiRoute {
  schema = {
    tags: ["Medication Schedules"],
    summary: "List medication schedules for an elderly",
    description:
      "Returns all active and inactive medication schedules configured for a specific elderly individual (accessible by RT Cadre, registered Family, or Admin).",
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
        description: "Elderly not found or access denied",
        content: {
          "application/json": {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
      },
    },
  };

  async handle(c: Context<AppEnv>) {
    const session = assertRole(c, "cadre", "family", "admin");
    const db = c.get("db");

    const { id: elderlyId } = c.req.param();

    // 1. Verify access to elderly (admin / cadre of same RT / registered family)
    await assertElderlyAccess(db, session, elderlyId);

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
