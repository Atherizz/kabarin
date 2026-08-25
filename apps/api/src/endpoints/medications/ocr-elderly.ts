import {
  z,
  ExtractMedicationOcrInputSchema,
  SmartOcrMedicationResultSchema,
} from "@kabarin/types";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole } from "../../lib/auth-guard";
import { assertElderlyAccess } from "../../lib/policies/elderly.policy";
import { extractMedicationsFromImage } from "../../lib/ai";

export class OcrElderlyMedicationEndpoint extends ApiRoute {
  schema = {
    tags: ["Medication Schedules"],
    summary: "Scan and parse prescription for an existing elderly",
    description:
      "Analyzes a medical prescription or medicine label image from Cloudflare R2 using Azure OpenAI Vision and extracts structured medication schedules for an existing elderly profile.",
    request: {
      params: z.object({
        id: z.string().describe("Target elderly UUID"),
      }),
      body: {
        content: {
          "application/json": { schema: ExtractMedicationOcrInputSchema },
        },
        required: true,
      },
    },
    responses: {
      "200": {
        description: "Prescription analyzed and structured medication schedules extracted successfully",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: SmartOcrMedicationResultSchema,
            }),
          },
        },
      },
      "400": {
        description: "Bad Request: Failed to parse medical prescription",
        content: {
          "application/json": {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
      },
      "401": {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: z.object({ success: z.literal(false), error: z.string() }),
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
    const body = await c.req.json<typeof ExtractMedicationOcrInputSchema._type>();

    // 1. Verify access to elderly profile
    await assertElderlyAccess(db, session, elderlyId);

    // 2. Execute AI Vision OCR extraction
    try {
      const result = await extractMedicationsFromImage(c.env, body.imageUrl);

      return c.json({
        success: true,
        data: result,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal mengekstrak resep medis dengan AI";
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
