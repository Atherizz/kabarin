import type { TriageContext, TriageEvaluationResult } from "@kabarin/types";
import { getAzureOpenAIClient } from "./client";
import { TRIAGE_SYSTEM_PROMPT } from "./prompts";

export type TriageResult = TriageEvaluationResult;

export async function triageElderlyResponse(
  context: TriageContext
): Promise<TriageEvaluationResult> {
  const profilePayload = {
    namaLansia: context.elderlyName,
    usia: context.age,
    jenisKelamin: context.gender,
    alamat: context.address,
    riwayatPenyakit: context.medicalHistory || "Tidak ada riwayat khusus yang tercatat",
    daftarObatAktif: context.activeMedications,
    tipePesan: context.messageType,
    isiPesanBalasan: context.messageText,
  };

  try {
    const { client, deploymentName } = getAzureOpenAIClient();

    const response = await client.chat.completions.create({
      model: deploymentName,
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_completion_tokens: 500,
      messages: [
        { role: "system", content: TRIAGE_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Data Lansia & Pesan Balasan:\n${JSON.stringify(profilePayload, null, 2)}`,
        },
      ],
    });

    const rawContent = response.choices[0]?.message?.content;
    if (!rawContent) return buildFallbackTriage(context);

    const parsed = JSON.parse(rawContent) as Partial<TriageEvaluationResult>;

    return {
      urgency: parsed.urgency || "normal",
      status: parsed.status || "green",
      sentiment: parsed.sentiment || "neutral",
      symptoms: Array.isArray(parsed.symptoms) ? parsed.symptoms : [],
      medicationCompliance:
        typeof parsed.medicationCompliance === "boolean"
          ? parsed.medicationCompliance
          : null,
      shouldEscalate: Boolean(parsed.shouldEscalate),
      escalationTier:
        parsed.escalationTier === 1 ||
        parsed.escalationTier === 2 ||
        parsed.escalationTier === 3
          ? parsed.escalationTier
          : null,
      escalationReason: parsed.escalationReason || null,
      clinicalReasoning: parsed.clinicalReasoning || "Triage otomatis diselesaikan oleh AI.",
      recommendedAction: parsed.recommendedAction || "Lanjutkan pemantauan rutin.",
      replyMessage:
        parsed.replyMessage ||
        `Matur nuwun atas kabarnya ${context.elderlyName}. Semoga sehat selalu nggih.`,
      toolsExecuted: Array.isArray(parsed.toolsExecuted) ? parsed.toolsExecuted : [],
    };
  } catch (error) {
    console.error("[triage] Error evaluating elderly response with AI:", error);
    return buildFallbackTriage(context);
  }
}

function buildFallbackTriage(context: TriageContext): TriageEvaluationResult {
  const lower = context.messageText.toLowerCase();
  const hasSevereKeywords =
    lower.includes("jatuh") ||
    lower.includes("pelo") ||
    lower.includes("dada") ||
    lower.includes("sesak") ||
    lower.includes("pingsan");
  const hasMildKeywords =
    lower.includes("pusing") ||
    lower.includes("lemas") ||
    lower.includes("mual") ||
    lower.includes("sakit") ||
    lower.includes("demam");

  if (hasSevereKeywords) {
    return {
      urgency: "emergency",
      status: "red",
      sentiment: "distressed",
      symptoms: ["indikasi darurat"],
      medicationCompliance: null,
      shouldEscalate: true,
      escalationTier: 3,
      escalationReason: "Pesan lansia mengandung kata kunci darurat kritis.",
      clinicalReasoning: "Fallback rule-based triage: kata kunci darurat terdeteksi.",
      recommendedAction: "Dispatch darurat seluruh relawan & keluarga.",
      replyMessage: `Mbah ${context.elderlyName}, tetap di posisi aman nggih. Bantuan darurat RT sedang menuju ke rumah Mbah sekarang.`,
      toolsExecuted: [],
    };
  }

  if (hasMildKeywords) {
    return {
      urgency: "needs_attention",
      status: "yellow",
      sentiment: "concerned",
      symptoms: ["keluhan fisik"],
      medicationCompliance: null,
      shouldEscalate: true,
      escalationTier: 1,
      escalationReason: "Lansia menyampaikan keluhan rasa tidak nyaman atau sakit.",
      clinicalReasoning: "Fallback rule-based triage: keluhan gejala terdeteksi.",
      recommendedAction: "Kunjungan relawan pendamping RT untuk verifikasi kondisi.",
      replyMessage: `Nggih Mbah ${context.elderlyName}, istirahat dulu nggih. Relawan RT sudah kami infokan untuk memeriksa kondisi Mbah.`,
      toolsExecuted: [],
    };
  }

  return {
    urgency: "normal",
    status: "green",
    sentiment: "positive",
    symptoms: [],
    medicationCompliance: true,
    shouldEscalate: false,
    escalationTier: null,
    escalationReason: null,
    clinicalReasoning: "Fallback rule-based triage: respon normal.",
    recommendedAction: "Pemantauan rutin.",
    replyMessage: `Alhamdulillah, matur nuwun kabarnya Mbah ${context.elderlyName}. Jaga kesehatan dan selamat beraktivitas nggih.`,
    toolsExecuted: [],
  };
}
