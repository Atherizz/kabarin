import { getAzureOpenAIClient } from "./client";
import type { RiskScoreBreakdown, RiskCategory } from "@kabarin/types";

interface XaiInput {
  elderlyName: string;
  totalScore: number;
  category: RiskCategory;
  breakdown: RiskScoreBreakdown;
}

const CATEGORY_LABEL: Record<RiskCategory, string> = {
  rendah: "Rendah",
  sedang: "Sedang",
  tinggi: "Tinggi",
};

export async function generateXaiNarrative(input: XaiInput): Promise<string> {
  const { elderlyName, totalScore, category, breakdown } = input;

  const breakdownText = [
    `MA (Kepatuhan Obat): ${breakdown.MA.score}/100 — ${breakdown.MA.note}`,
    `RP (Pola Respons): ${breakdown.RP.score}/100 — ${breakdown.RP.note}`,
    `SB (Beban Keluhan): ${breakdown.SB.score}/100 — ${breakdown.SB.note}`,
    `PHE (Riwayat Kejadian): ${breakdown.PHE.score}/100 — ${breakdown.PHE.note}`,
    `M (Multimorbiditas): ${breakdown.M.score}/100 — ${breakdown.M.note}`,
  ].join("\n");

  const prompt = `Kamu adalah sistem analitik pemantauan lansia Kabarin. Tugas kamu: tulis 1 paragraf narasi ringkas (2–3 kalimat) yang menjelaskan skor risiko lansia kepada kader RT.

Data lansia:
Nama: ${elderlyName}
Skor Risiko: ${totalScore}/100 (Kategori: ${CATEGORY_LABEL[category]})

Rincian 5 dimensi:
${breakdownText}

Aturan penulisan:
- Gunakan Bahasa Indonesia santun, langsung ke poin, mudah dipahami kader RT non-medis.
- Sebutkan dimensi mana yang menjadi penyebab utama skor.
- Akhiri dengan rekomendasi tindak lanjut yang konkret (kunjungan, pemantauan, dsb).
- Jangan gunakan emoji. Jangan sebut nama dimensi dalam bahasa Inggris.
- Format output: teks paragraf biasa, bukan JSON.`;

  try {
    const { client, deploymentName } = getAzureOpenAIClient();
    const response = await client.chat.completions.create({
      model: deploymentName,
      temperature: 0.3,
      max_completion_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });

    return response.choices[0]?.message?.content?.trim() ?? buildFallbackNarrative(input);
  } catch {
    return buildFallbackNarrative(input);
  }
}

function buildFallbackNarrative(input: XaiInput): string {
  const { elderlyName, totalScore, category, breakdown } = input;
  const label = CATEGORY_LABEL[category];

  const highDimensions = Object.entries(breakdown)
    .filter(([, v]) => v.score >= 50)
    .map(([, v]) => v.note);

  const reasons = highDimensions.length > 0
    ? highDimensions.join("; ")
    : "tidak ada faktor risiko dominan yang terdeteksi";

  const action = category === "tinggi"
    ? "Prioritaskan kunjungan relawan dalam 24 jam ke depan."
    : category === "sedang"
    ? "Disarankan pemantauan lebih ketat dan kunjungan proaktif."
    : "Lanjutkan pemantauan rutin harian.";

  return `Skor risiko ${elderlyName} adalah ${totalScore}/100 (${label}). Faktor utama: ${reasons}. ${action}`;
}
