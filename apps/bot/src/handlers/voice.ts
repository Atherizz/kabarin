import { toFile } from "groq-sdk";
import type { proto, WASocket } from "@whiskeysockets/baileys";
import { downloadMediaMessage } from "@whiskeysockets/baileys";
import { getGroqClient } from "../ai/groq-client";

const WHISPER_MODEL = "whisper-large-v3-turbo";
const STT_PROMPT =
  "Percakapan sapaan dan keluhan kesehatan lansia dalam Bahasa Indonesia atau Bahasa Jawa sehari-hari. " +
  "Kosakata umum: nggih, mboten, inggih, monggo, matur nuwun, alhamdulillah, Mbah, Mas, Mbak, Bu, Pak, le, nduk, wis, sampun, dereng, mangan, ngunjuk. " +
  "Keluhan kesehatan: pusing, ngelu, mumet, pusing berputar, lemas, lemes, kesel, mual, enek, sesak napas, nyeri dada, nyeri sendi, boyok, linu, pegel, lara, " +
  "kesemutan, gemetar, nrodok, pelo, susah bicara, jatuh, tiba, glundung, pingsan, demam, panas, sumer, batuk, diare, mencret, tidak nafsu makan, " +
  "sakit kepala, sirah, mata kabur, bengkak, susah tidur, ora iso turu. " +
  "Obat-obatan: Amlodipine, Metformin, Captopril, Bisoprolol, Atorvastatin, Furosemide, " +
  "Glibenclamide, Aspirin, Omeprazole, obat tensi, obat gula, obat jantung, obat linu.";

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
