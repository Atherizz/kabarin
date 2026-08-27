import { SmartOcrMedicationResultSchema, type SmartOcrMedicationResult } from "@kabarin/types";
import type { AppEnv } from "../../types/app-env";
import { getAzureOpenAIClient } from "./azure-client";
import { PRESCRIPTION_OCR_SYSTEM_PROMPT } from "./prompts";

export async function extractMedicationsFromImage(
  env: AppEnv["Bindings"] | undefined,
  imageUrl: string
): Promise<SmartOcrMedicationResult> {
  const { client, deploymentName } = getAzureOpenAIClient(env);

  try {
    const response = await client.chat.completions.create({
      model: deploymentName,
      response_format: { type: "json_object" },
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: PRESCRIPTION_OCR_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Ekstrak seluruh daftar obat, dosis, aturan minum, dan jadwal pengingat dari foto resep medis/etiket obat ini ke dalam format JSON yang valid.",
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("AI tidak memberikan respon teks dari gambar yang diberikan.");
    }

    const rawJson = JSON.parse(content);

    // Normalize & validate with Zod
    const validated = SmartOcrMedicationResultSchema.parse({
      conditionName: rawJson.conditionName || "Kondisi Medis / Resep Obat",
      medications: Array.isArray(rawJson.medications)
        ? rawJson.medications.map((m: Record<string, unknown>) => {
            const timeOfDay = normalizeTimeOfDay(String(m.timeOfDay || "morning"));
            return {
              name: String(m.name || "Obat"),
              dosage: String(m.dosage || "1 tablet"),
              frequency: String(m.frequency || "1x sehari"),
              timeOfDay,
              timingInstruction: normalizeTimingInstruction(String(m.timingInstruction || "after_meal")),
              reminderTime: String(m.reminderTime || getDefaultReminderTime(timeOfDay)),
              notes: m.notes ? String(m.notes) : undefined,
            };
          })
        : [],
      rawExtractedText: rawJson.rawExtractedText ? String(rawJson.rawExtractedText) : undefined,
    });

    return validated;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Gagal memproses Smart OCR Resep Medis: ${error.message}`);
    }
    throw new Error("Terjadi kesalahan yang tidak terduga saat memproses OCR.");
  }
}

function normalizeTimeOfDay(val: string): "morning" | "afternoon" | "evening" | "bedtime" {
  const lower = val.toLowerCase();
  if (lower.includes("pagi") || lower === "morning") return "morning";
  if (lower.includes("siang") || lower === "afternoon") return "afternoon";
  if (lower.includes("sore") || lower.includes("malam") || lower === "evening") return "evening";
  if (lower.includes("tidur") || lower === "bedtime") return "bedtime";
  return "morning";
}

function normalizeTimingInstruction(val: string): "before_meal" | "after_meal" | "with_meal" | "any_time" {
  const lower = val.toLowerCase();
  if (lower.includes("sebelum") || lower === "before_meal") return "before_meal";
  if (lower.includes("sesudah") || lower.includes("setelah") || lower === "after_meal") return "after_meal";
  if (lower.includes("bersama") || lower === "with_meal") return "with_meal";
  return "after_meal";
}

function getDefaultReminderTime(timeOfDay: "morning" | "afternoon" | "evening" | "bedtime"): string {
  switch (timeOfDay) {
    case "morning":
      return "07:00";
    case "afternoon":
      return "13:00";
    case "evening":
      return "18:00";
    case "bedtime":
      return "21:00";
  }
}
