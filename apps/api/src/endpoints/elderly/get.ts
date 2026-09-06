import { z, ElderlySchema } from "@kabarin/types";
import { eq, elderly } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole } from "../../lib/auth-guard";
import { assertElderlyAccess } from "../../lib/policies/elderly.policy";

export class GetElderlyEndpoint extends ApiRoute {
  schema = {
    tags: ["Elderly Management"],
    summary: "Get single elderly profile",
    description:
      "Returns the full profile of a single elderly individual with active medications, family contacts, and assigned volunteers. " +
      "Accessible by RT Cadre (same RT), registered Family (linked via elderlyFamily), or Admin.",
    request: {
      params: z.object({
        id: z.string(),
      }),
    },
    responses: {
      "200": {
        description: "Elderly full profile",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: ElderlySchema,
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
    const { id } = c.req.param();

    await assertElderlyAccess(db, session, id);

    const record = await db.query.elderly.findFirst({
      where: eq(elderly.id, id),
      with: {
        familyMembers: true,
        medications: true,
        volunteerAssignments: {
          with: {
            volunteer: true,
          },
        },
      },
    });

    if (!record) {
      return c.json({ success: false, error: "Data lansia tidak ditemukan" }, 404);
    }

    return c.json({
      success: true,
      data: {
        ...record,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
        familyMembers: record.familyMembers?.map((f) => ({
          ...f,
          createdAt: f.createdAt.toISOString(),
          updatedAt: f.updatedAt.toISOString(),
        })),
        medications: record.medications?.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
          updatedAt: m.updatedAt.toISOString(),
        })),
      },
    });
  }
}