export async function apiPost<T>(path: string, body: unknown): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(path, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    if (!res.ok || json.success === false) {
      return { ok: false, error: json.error ?? json.message ?? "Terjadi kesalahan." };
    }
    return { ok: true, data: json.data ?? json };
  } catch (err) {
    console.error("apiPost Error:", err);
    return { ok: false, error: "Koneksi ke server gagal." };
  }
}