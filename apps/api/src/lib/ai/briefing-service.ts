import type { AppDatabase } from "@kabarin/db";
import {
  eq,
  and,
  elderly,
  checkinSessions,
  escalationLogs,
  volunteerVisits,
  communityUnits,
} from "@kabarin/db";
import type { AppEnv } from "../../types/app-env";
import type { BriefingResponse, ActionItem } from "@kabarin/types";
import { getAzureOpenAIClient } from "./azure-client";
import { MORNING_BRIEFING_PROMPT } from "./prompts";

// In-memory cache: communityUnitId -> { data, expiresAt }
const briefingCache = new Map<string, { data: BriefingResponse; expiresAt: number }>();

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export async function generateDailyBriefing(
  db: AppDatabase,
  env: AppEnv["Bindings"] | undefined,
  communityUnitId: string
): Promise<BriefingResponse> {
  // Return cached result if still valid
  const cached = briefingCache.get(communityUnitId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
  }).format(new Date());

  // Parallel queries for all operational data needed
  const [community, elderlyRecords, todayCheckins, openEscalations, pendingVisits] =
    await Promise.all([
      db.query.communityUnits.findFirst({
        where: eq(communityUnits.id, communityUnitId),
      }),
      db.query.elderly.findMany({
        where: eq(elderly.communityUnitId, communityUnitId),
      }),
      db.query.checkinSessions.findMany({
        where: and(
          eq(checkinSessions.communityUnitId, communityUnitId),
          eq(checkinSessions.sessionDate, todayStr)
        ),
        with: { elderly: true },
      }),
      db.query.escalationLogs.findMany({
        where: and(
          eq(escalationLogs.communityUnitId, communityUnitId),
          eq(escalationLogs.status, "open")
        ),
        with: { elderly: true },
      }),
      db.query.volunteerVisits.findMany({
        where: and(
          eq(volunteerVisits.communityUnitId, communityUnitId),
          eq(volunteerVisits.status, "pending")
        ),
        with: { elderly: true },
      }),
    ]);

  // Derive stats
  const missedCheckins = todayCheckins.filter(
    (c) => c.status === "pending" || c.status === "sent" || c.status === "reminded"
  );
  const pendingVerifications = elderlyRecords.filter(
    (e) => e.verificationStatus === "pending_verification"
  );
  const highRiskCount = elderlyRecords.filter((e) => (e.riskScore ?? 0) >= 70).length;

  const stats = {
    missedCheckins: missedCheckins.length,
    openEscalations: openEscalations.length,
    pendingVerifications: pendingVerifications.length,
    pendingVisits: pendingVisits.length,
    highRiskCount,
  };

  // Build sorted action items 
  const actionItems: ActionItem[] = [];

  for (const esc of openEscalations) {
    actionItems.push({
      type: "open_escalation",
      label: `${esc.elderly?.name ?? "Lansia"} — eskalasi aktif (Tier ${esc.tier ?? 1})`,
      elderlyId: esc.elderlyId,
      elderlyName: esc.elderly?.name ?? null,
      priority: "urgent",
    });
  }

  for (const checkin of missedCheckins) {
    actionItems.push({
      type: "missed_checkin",
      label: `${checkin.elderly?.name ?? "Lansia"} belum membalas sapaan pagi`,
      elderlyId: checkin.elderlyId,
      elderlyName: checkin.elderly?.name ?? null,
      priority: "urgent",
    });
  }

  for (const ep of pendingVerifications) {
    actionItems.push({
      type: "pending_verification",
      label: `${ep.name} (${ep.address}) menunggu verifikasi RT`,
      elderlyId: ep.id,
      elderlyName: ep.name,
      priority: "normal",
    });
  }

  for (const visit of pendingVisits) {
    actionItems.push({
      type: "pending_visit",
      label: `Kunjungan ke ${visit.elderly?.name ?? "Lansia"} belum dilaporkan`,
      elderlyId: visit.elderlyId,
      elderlyName: visit.elderly?.name ?? null,
      priority: "normal",
    });
  }

  // Generate AI summary
  const operationalContext = JSON.stringify({
    cadreRT: community?.name ?? "RT",
    date: todayStr,
    stats,
    urgentItems: actionItems
      .filter((a) => a.priority === "urgent")
      .map((a) => a.label)
      .slice(0, 5),
    normalItems: actionItems
      .filter((a) => a.priority === "normal")
      .map((a) => a.label)
      .slice(0, 5),
  });

  let summary = buildFallbackSummary(stats, community?.name);

  try {
    const { client, deploymentName } = getAzureOpenAIClient(env);
    const response = await client.chat.completions.create({
      model: deploymentName,
      temperature: 0.7,
      max_completion_tokens: 200,
      messages: [
        { role: "system", content: MORNING_BRIEFING_PROMPT },
        { role: "user", content: operationalContext },
      ],
    });
    const aiText = response.choices[0]?.message?.content?.trim();
    if (aiText) summary = aiText;
  } catch {
    // Fallback to rule-based summary if AI call fails — bot shouldn't break
  }

  const result: BriefingResponse = {
    generatedAt: new Date().toISOString(),
    summary,
    actionItems,
    stats,
  };

  // Cache for 15 minutes
  briefingCache.set(communityUnitId, {
    data: result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return result;
}

function buildFallbackSummary(
  stats: BriefingResponse["stats"],
  rtName?: string
): string {
  const parts: string[] = [];
  const rt = rtName ?? "RT ini";

  if (stats.openEscalations > 0) {
    parts.push(
      `Terdapat ${stats.openEscalations} eskalasi darurat aktif yang perlu segera ditangani di ${rt}.`
    );
  }
  if (stats.missedCheckins > 0) {
    parts.push(
      `${stats.missedCheckins} lansia belum membalas sapaan pagi hari ini.`
    );
  }
  if (stats.pendingVerifications > 0) {
    parts.push(
      `Ada ${stats.pendingVerifications} warga baru yang menunggu verifikasi RT.`
    );
  }
  if (parts.length === 0) {
    parts.push(`Semua lansia di ${rt} dalam kondisi baik hari ini. Tidak ada tindakan mendesak. 🙂`);
  }

  return parts.join(" ");
}
