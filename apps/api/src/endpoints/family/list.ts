import { z, ElderlyFamilySchema } from "@kabarin/types";
import { eq, desc, elderlyFamily } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole } from "../../lib/auth-guard";
import { assertElderlyAccess } from "../../lib/policies/elderly.policy";

export class ListFamilyEndpoint extends ApiRoute {
  schema = {
    tags: ["Family Contacts"],
    summary: "List all family contacts for an elderly",
    description: "Returns all registered family members linked to an elderly individual, including access tokens for the status page.",
    request: {
      params: z.object({
        id: z.string(),
      }),
    },
    responses: {
      "200": {
        description: "List of family contacts",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: z.array(ElderlyFamilySchema),
            }),
          },
        },
      },
      "403": {
        description: "Forbidden: Not permitted to manage this elderly",
        content: {
          "application/json": {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
      },
      "404": {
        description: "Elderly not found",
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

    // 2. Fetch family members
    const records = await db.query.elderlyFamily.findMany({
      where: eq(elderlyFamily.elderlyId, elderlyId),
      orderBy: [desc(elderlyFamily.isPrimaryContact), desc(elderlyFamily.createdAt)],
    });

    const data = records.map((f) => ({
      ...f,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    }));

    return c.json({ success: true, data });
  }
}
