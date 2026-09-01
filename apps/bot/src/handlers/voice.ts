import { toFile } from "groq-sdk";
import type { proto, WASocket } from "@whiskeysockets/baileys";
import { downloadMediaMessage } from "@whiskeysockets/baileys";
import { getGroqClient } from "../ai/groq-client";

const WHISPER_MODEL = "whisper-large-v3-turbo";
const STT_PROMPT =
  "Percakapan lansia dalam Bahasa Indonesia atau Bahasa Jawa. " +
  "Sapaan umum: nggih, mboten, inggih, monggo, matur nuwun, alhamdulillah, Mbah, Mas, Bu, Pak, le, nduk. " +
  "Keluhan kesehatan: pusing, pusing berputar, lemas, mual, sesak napas, nyeri dada, nyeri sendi, " +
  "kesemutan, gemetar, pelo, susah bicara, jatuh, pingsan, demam, batuk, diare, tidak nafsu makan, " +
  "sakit kepala, mata kabur, bengkak, susah tidur, linu, pegal-pegal. " +
  "Obat-obatan umum: Amlodipine, Metformin, Captopril, Bisoprolol, Atorvastatin, Furosemide, " +
  "Glibenclamide, Aspirin, Omeprazole, Vitamin B12, obat tensi, obat gula, obat jantung. " +
  "Kondisi: hipertensi, diabetes, stroke, asam urat, kolesterol, jantung, rematik.";

export async function transcribeVoiceNote(
  sock: WASocket,
  msg: proto.IWebMessageInfo
): Promise<string | null> {
  try {
    const buffer = await downloadMediaMessage(msg, "buffer", {});

    const audioFile = await toFile(buffer as Buffer, "voice.ogg", {
      type: "audio/ogg",
    });

    const groq = getGroqClient();
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: WHISPER_MODEL,
      language: "id",
      prompt: STT_PROMPT,
      response_format: "json",
      temperature: 0,
    });

    const text = transcription.text?.trim();
    if (!text) return null;

    console.log(`[voice] Whisper transcript: "${text}"`);
    return text;
  } catch (error) {
    console.error("[voice] Failed to transcribe voice note:", error);
    return null;
  }
}
