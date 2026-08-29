import type { AppDatabase } from "@kabarin/db";
import { eq, and, elderly, elderlyMedications } from "@kabarin/db";
import type { AppEnv } from "../../types/app-env";
import type { GuidedChecklistItem } from "@kabarin/types";
import { getAzureOpenAIClient } from "./azure-client";
import { GUIDED_CHECKLIST_PROMPT } from "./prompts";

export async function generateGuidedChecklist(
  db: AppDatabase,
  env: AppEnv["Bindings"] | undefined,
  elderlyId: string
): Promise<GuidedChecklistItem[]> {
  // Fetch elderly profile + active medications for context
  const [elderlyRecord, medications] = await Promise.all([
    db.query.elderly.findFirst({
      where: eq(elderly.id, elderlyId),
    }),
    db.query.elderlyMedications.findMany({
      where: and(
        eq(elderlyMedications.elderlyId, elderlyId),
        eq(elderlyMedications.isActive, true)
      ),
    }),
  ]);

  if (!elderlyRecord) return buildFallbackChecklist();

  const profile = JSON.stringify({
    name: elderlyRecord.name,
    age: elderlyRecord.age,
    gender: elderlyRecord.gender,
    mobilityStatus: elderlyRecord.mobilityStatus,
    medicalHistory: elderlyRecord.medicalHistory ?? "Tidak ada riwayat penyakit yang diketahui",
    activeMedications: medications.map((m) => ({
      name: m.medicationName,
      condition: m.conditionName,
      frequency: m.frequency,
    })),
  });

  try {
    const { client, deploymentName } = getAzureOpenAIClient(env);
    const response = await client.chat.completions.create({
      model: deploymentName,
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_completion_tokens: 300,
      messages: [
        { role: "system", content: GUIDED_CHECKLIST_PROMPT },
        {
          role: "user",
          content: `Profil lansia:\n${profile}\n\nBuat checklist observasi untuk kunjungan relawan awam. Response sebagai JSON object dengan key "checklist" berisi array.`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return buildFallbackChecklist();

    const parsed = JSON.parse(content);
    const items: unknown[] = Array.isArray(parsed) ? parsed : (parsed.checklist ?? []);

    const validated: GuidedChecklistItem[] = items
      .filter((item): item is { question: string; type: string } =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Record<string, unknown>).question === "string"
      )
      .slice(0, 5)
      .map((item) => ({
        question: item.question,
        type: "yes_no" as const,
      }));

    return validated.length >= 3 ? validated : buildFallbackChecklist();
  } catch (err) {
    console.error("[generateGuidedChecklist Error]", err);
    // AI call failed — return sensible defaults so bot dispatch is not blocked
    return buildFallbackChecklist();
  }
}

// Generic checklist for when AI fails or medical history is unknown
export function buildFallbackChecklist(): GuidedChecklistItem[] {
  return [
    { question: "Apakah lansia terlihat sadar dan bisa berkomunikasi dengan jelas?", type: "yes_no" },
    { question: "Apakah lansia mengeluh sakit atau rasa tidak nyaman?", type: "yes_no" },
    { question: "Apakah lansia sudah makan dan minum hari ini?", type: "yes_no" },
    { question: "Apakah lansia sudah minum obat hariannya?", type: "yes_no" },
    { question: "Apakah kondisi rumah dan lingkungan sekitar lansia terlihat aman?", type: "yes_no" },
  ];
}

export async function refreshElderlyChecklist(
  db: AppDatabase,
  env: AppEnv["Bindings"] | undefined,
  elderlyId: string
): Promise<void> {
  const checklist = await generateGuidedChecklist(db, env, elderlyId);
  await db
    .update(elderly)
    .set({ defaultChecklist: checklist, updatedAt: new Date() })
    .where(eq(elderly.id, elderlyId));
}
