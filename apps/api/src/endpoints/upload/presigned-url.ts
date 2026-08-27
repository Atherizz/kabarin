import {
  z,
  PresignedUploadRequestSchema,
  PresignedUploadResponseSchema,
} from "@kabarin/types";
import { eq, and, gt, volunteerVisits } from "@kabarin/db";
import { getSession } from "@kabarin/auth";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { requestPresignedUpload } from "../../lib/storage";

export class PresignedUploadEndpoint extends ApiRoute {
  schema = {
    tags: ["Storage & Upload"],
    summary: "Request a temporary presigned upload URL",
    description:
      "Generates a temporary S3/R2 presigned PUT URL valid for 15 minutes. Supports authenticated sessions (Cadre, Volunteer, Family, Admin) or zero-login volunteer field visits via active formToken.",
    request: {
      body: {
        content: {
          "application/json": { schema: PresignedUploadRequestSchema },
        },
        required: true,
      },
    },
    responses: {
      "200": {
        description: "Presigned upload URL generated successfully",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: PresignedUploadResponseSchema,
            }),
          },
        },
      },
      "400": {
        description: "Bad Request: Invalid storage type or content type",
        content: {
          "application/json": {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
      },
      "401": {
        description: "Unauthorized: Missing session or invalid/expired formToken",
        content: {
          "application/json": {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
      },
    },
  };

  async handle(c: Context<AppEnv>) {
    const body = await c.req.json<typeof PresignedUploadRequestSchema._type>();
    const auth = c.get("auth");
    const db = c.get("db");

    // 1. Resolve session if present (cookie or authorization header)
    let session = c.get("session");
    if (!session && auth) {
      session = await getSession(auth, c.req.raw);
    }

    // 2. Authorization: either active session or valid zero-login visit formToken
    if (!session?.user) {
      if (!body.formToken) {
        return c.json(
          {
            success: false,
            error: "Autentikasi diperlukan. Silakan login atau sertakan formToken kunjungan yang valid.",
          },
          401
        );
      }

      // Validate volunteer visit token
      const visit = await db.query.volunteerVisits.findFirst({
        where: and(
          eq(volunteerVisits.formToken, body.formToken),
          eq(volunteerVisits.status, "pending"),
          gt(volunteerVisits.tokenExpiresAt, new Date())
        ),
      });

      if (!visit) {
        return c.json(
          {
            success: false,
            error: "Token formulir kunjungan relawan tidak valid atau sudah kedaluwarsa.",
          },
          401
        );
      }

      // Zero-login token is only permitted for visitPhoto
      if (body.type !== "visitPhoto") {
        return c.json(
          {
            success: false,
            error: "Token formulir kunjungan hanya diizinkan untuk mengunggah foto kunjungan (visitPhoto).",
          },
          400
        );
      }
    }

    // 2. Generate presigned upload URL
    try {
      const result = await requestPresignedUpload(c.env, {
        type: body.type,
        fileName: body.fileName,
        contentType: body.contentType,
      });

      return c.json({
        success: true,
        data: result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal membuat presigned upload URL";
      return c.json(
        {
          success: false,
          error: message,
        },
        400
      );
    }
  }
}
