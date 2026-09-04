import type { GreetingContext, ReminderContext } from "@kabarin/types";
import { getAzureOpenAIClient } from "./client";
import { MORNING_GREETING_SYSTEM_PROMPT, REMINDER_GREETING_SYSTEM_PROMPT } from "./prompts";

export async function generateMorningGreeting(context: GreetingContext): Promise<string> {
  try {
    const { client, deploymentName } = getAzureOpenAIClient();

    const response = await client.chat.completions.create({
      model: deploymentName,
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_completion_tokens: 300,
      messages: [
        { role: "system", content: MORNING_GREETING_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Data Lansia:\n${JSON.stringify(context, null, 2)}`,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content;
    if (raw) {
      const parsed = JSON.parse(raw) as { greetingMessage?: string };
      if (parsed.greetingMessage) return parsed.greetingMessage;
    }
  } catch (error) {
    console.error("[greeting] Error generating dynamic AI morning greeting:", error);
  }

  return buildFallbackGreeting(context);
}

export async function generateReminderGreeting(context: ReminderContext): Promise<string> {
  try {
    const { client, deploymentName } = getAzureOpenAIClient();

    const response = await client.chat.completions.create({
      model: deploymentName,
      response_format: { type: "json_object" },
      temperature: 0.6,
      max_completion_tokens: 200,
      messages: [
        { role: "system", content: REMINDER_GREETING_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Data Lansia:\n${JSON.stringify(context, null, 2)}`,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content;
    if (raw) {
      const parsed = JSON.parse(raw) as { reminderMessage?: string };
      if (parsed.reminderMessage) return parsed.reminderMessage;
    }
  } catch (error) {
    console.error("[greeting] Error generating dynamic AI reminder:", error);
  }

  return `Assalamu'alaikum Mbah ${context.elderlyName}, kami ingin memastikan kabar Mbah pagi ini. Apakah Mbah dalam keadaan sehat? Cukup balas "Sehat" agar keluarga dan relawan merasa tenang ya.`;
}

function buildFallbackGreeting(context: GreetingContext): string {
  let medText = "";
  if (context.morningMedications.length > 0) {
    const meds = context.morningMedications
      .map((m) => `${m.medicationName} (${m.dosage})`)
      .join(", ");
    medText = `\nSetelah sarapan nanti jangan lupa obat ${meds} diminum ya Mbah.\n`;
  }

  return (
    `Assalamu'alaikum, selamat pagi Mbah *${context.elderlyName}*, selamat hari ${context.dayName}.\n` +
    medText +
    `\nPagi ini bagaimana kabarnya Mbah, apakah badan terasa sehat atau ada keluhan? Mbah bisa membalas lewat pesan teks atau rekaman suara ya.`
  );
}
