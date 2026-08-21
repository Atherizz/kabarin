import { z, VolunteerVisitSchema } from "@kabarin/types";
import { eq, volunteerVisits } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole } from "../../lib/auth-guard";

export class GetVisitEndpoint extends ApiRoute {
  schema = {
    tags: ["Field Visits"],
    summary: "Get volunteer visit details",
    description: "Returns detailed information of a specific volunteer visit task or report log.",
    request: {
      params: z.object({
        id: z.string().describe("Volunteer visit UUID"),
      }),
    },
    responses: {
      "200": {
        description: "Volunteer visit details",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: VolunteerVisitSchema,
            }),
          },
        },
      },
      "404": {
        description: "Visit record not found or inaccessible",
        content: {
          "application/json": {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
      },
    },
  };

  async handle(c: Context<AppEnv>) {
    const session = assertRole(c, "cadre", "volunteer", "admin");
    const db = c.get("db");
    const { id: visitId } = c.req.param();

    const visit = await db.query.volunteerVisits.findFirst({
      where: eq(volunteerVisits.id, visitId),
      with: {
        volunteer: true,
      },
    });

    if (!visit) {
      return c.json({ success: false, error: "Data kunjungan tidak ditemukan" }, 404);
    }

    // Scoping validation
    if (session.user.role === "cadre" && visit.communityUnitId !== session.user.communityUnitId) {
      return c.json({ success: false, error: "Kunjungan ini bukan di wilayah RT Anda" }, 404);
    }

    if (session.user.role === "volunteer" && visit.volunteer?.userId !== session.user.id) {
      return c.json({ success: false, error: "Akses ditolak: Kunjungan ini bukan tugas Anda" }, 403);
    }

    return c.json({
      success: true,
      data: {
        ...visit,
        tokenExpiresAt: visit.tokenExpiresAt.toISOString(),
        visitedAt: visit.visitedAt ? visit.visitedAt.toISOString() : null,
        createdAt: visit.createdAt.toISOString(),
        updatedAt: visit.updatedAt.toISOString(),
      },
    });
  }
}
