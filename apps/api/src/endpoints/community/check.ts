import { z, CheckCommunityQuerySchema, CheckCommunityResponseSchema } from "@kabarin/types";
import { eq, communityUnits } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";

export class CheckCommunityEndpoint extends ApiRoute {
  schema = {
    tags: ["Community"],
    summary: "Check RT availability (Real-Time Composite Territory Check)",
    description:
      "Public endpoint. Validates whether a specific RT/RW composite code ({subdistrictCode}-RWxx-RTxx) is already registered in Kabarin.",
    request: {
      query: CheckCommunityQuerySchema,
    },
    responses: {
      "200": {
        description: "Territory availability status",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: CheckCommunityResponseSchema,
            }),
          },
        },
      },
    },
  };

  async handle(c: Context<AppEnv>) {
    const db = c.get("db");
    const query = CheckCommunityQuerySchema.parse(c.req.query());

    const rw = query.rw.padStart(2, "0");
    const rt = query.rt.padStart(2, "0");
    const code = `${query.subdistrictCode}-RW${rw}-RT${rt}`;

    const existing = await db.query.communityUnits.findFirst({
      where: eq(communityUnits.code, code),
    });

    if (existing) {
      return c.json({
        success: true,
        data: {
          available: false,
          code,
          message: `Wilayah RT ${query.rt} / RW ${query.rw} (${code}) sudah didaftarkan sebelumnya.`,
          existingCommunityName: existing.name,
        },
      });
    }

    return c.json({
      success: true,
      data: {
        available: true,
        code,
        message: `RT ${query.rt} / RW ${query.rw} (${code}) tersedia untuk didaftarkan!`,
        existingCommunityName: null,
      },
    });
  }
}
