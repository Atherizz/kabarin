interface OcrMedication {
  conditionName: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  timeOfDay: string;
  timingInstruction: string;
  reminderTime: string;
}

export async function runMedicationOcr(imageUrl: string): Promise<{ ok: boolean; medications?: OcrMedication[]; error?: string }> {
  try {
    const res = await fetch("/api/ocr/medications", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl }),
    });

    const json = await res.json();

    if (!res.ok || json.success === false) {
      return { ok: false, error: json.error ?? "Gagal membaca resep." };
    }

    return { ok: true, medications: json.data?.medications ?? json.data };
  } catch {
    return { ok: false, error: "Koneksi gagal saat memproses OCR." };
  }
}