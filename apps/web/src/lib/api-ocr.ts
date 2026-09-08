interface OcrMedication {
  conditionName: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  timeOfDay: string;
  timingInstruction: string;
  reminderTime: string;
  notes?: string;
}

interface RawOcrMedication {
  name: string;
  dosage: string;
  frequency: string;
  timeOfDay: string;
  timingInstruction: string;
  reminderTime: string;
  notes?: string;
}

interface RawOcrResult {
  conditionName: string;
  medications: RawOcrMedication[];
  rawExtractedText?: string;
}

export async function runMedicationOcr(
  imageUrl: string,
  elderlyId?: string
): Promise<{ ok: boolean; medications?: OcrMedication[]; error?: string }> {
  const apiBase = import.meta.env.BETTER_AUTH_URL ?? "https://kabarin-api.atherizz.dev";

  const path = elderlyId ? `/api/elderly/${elderlyId}/ocr` : "/api/ocr/medications";

  try {
    const res = await fetch(`${apiBase}${path}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl }),
    });

    const json = await res.json();

    if (!res.ok || json.success === false) {
      return { ok: false, error: json.error ?? "Gagal membaca resep." };
    }

    const raw = json.data as RawOcrResult;

    if (!raw?.medications) {
      return { ok: false, error: "Tidak ada obat yang terbaca dari foto." };
    }

    const medications: OcrMedication[] = raw.medications.map((m) => ({
      conditionName: raw.conditionName ?? "",
      medicationName: m.name,
      dosage: m.dosage,
      frequency: m.frequency,
      timeOfDay: m.timeOfDay,
      timingInstruction: m.timingInstruction,
      reminderTime: m.reminderTime,
      notes: m.notes,
    }));

    return { ok: true, medications };
  } catch {
    return { ok: false, error: "Koneksi gagal saat memproses OCR." };
  }
}