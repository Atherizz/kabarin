import { z, ElderlySchema, ElderlyQuerySchema } from "@kabarin/types";
import { eq, and, desc, sql, elderly } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";

export class ListElderlyEndpoint extends ApiRoute {
  schema = {
    tags: ["Elderly"],
    summary: "List all elderly in cadre's RT",
    description: "Returns all elderly members registered under the authenticated cadre's RT, ordered by priority status (red -> yellow -> green -> grey).",
    request: {
      query: ElderlyQuerySchema,
    },
    responses: {
      "200": {
        description: "List of elderly profiles",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: z.array(ElderlySchema),
            }),
          },
        },
      },
      "403": {
        description: "User is not associated with an RT",
        content: {
          "application/json": {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
      },
    },
  };

  async handle(c: Context<AppEnv>) {
    const db = c.get("db");
    const session = c.get("session")!;
    const communityUnitId = session.user.communityUnitId;

    if (!communityUnitId) {
      return c.json({ success: false, error: "Akun Anda belum terhubung ke wilayah RT" }, 403);
    }

    const { status, mobilityStatus, monitoringMode, search } = ElderlyQuerySchema.parse(c.req.query());

    const conditions = [eq(elderly.communityUnitId, communityUnitId)];

    if (status) conditions.push(eq(elderly.currentStatus, status));
    if (mobilityStatus) conditions.push(eq(elderly.mobilityStatus, mobilityStatus));
    if (monitoringMode) conditions.push(eq(elderly.monitoringMode, monitoringMode));
    if (search?.trim()) {
      const keyword = `%${search.trim()}%`;
      conditions.push(
        sql`(${elderly.name} ILIKE ${keyword} OR ${elderly.address} ILIKE ${keyword})`
      );
    }

    const records = await db.query.elderly.findMany({
      where: and(...conditions),
      orderBy: [
        // Custom priority sorting: red -> yellow -> green -> grey
        sql`CASE 
          WHEN ${elderly.currentStatus} = 'red' THEN 1 
          WHEN ${elderly.currentStatus} = 'yellow' THEN 2 
          WHEN ${elderly.currentStatus} = 'green' THEN 3 
          ELSE 4 
        END ASC`,
        desc(elderly.createdAt),
      ],
      with: {
        familyMembers: true,
        medications: true,
      },
    });

    const data = records.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
      familyMembers: e.familyMembers?.map((f) => ({
        ...f,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
      })),
      medications: e.medications?.map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      })),
    }));

    return c.json({ success: true, data });
  }
}
