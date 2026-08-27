import {
  z,
  ExtractMedicationOcrInputSchema,
  SmartOcrMedicationResultSchema,
} from "@kabarin/types";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole } from "../../lib/auth-guard";
import { extractMedicationsFromImage } from "../../lib/ai";

export class OcrGeneralMedicationEndpoint extends ApiRoute {
  schema = {
    tags: ["Medication Schedules"],
    summary: "Scan and parse prescription during elderly onboarding",
    description:
      "Analyzes a medical prescription or medicine label image from Cloudflare R2 using Azure OpenAI Vision. Used in the new elderly onboarding wizard before the elderly record is created.",
    request: {
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
        description: "Forbidden: Only Cadres, Family, or Admins can perform OCR onboarding",
        content: {
          "application/json": {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
      },
    },
  };

  async handle(c: Context<AppEnv>) {
    // Requires authenticated Cadre, Family, or Admin session
    assertRole(c, "cadre", "family", "admin");

    const body = await c.req.json<typeof ExtractMedicationOcrInputSchema._type>();

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
