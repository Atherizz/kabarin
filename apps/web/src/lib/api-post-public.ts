export async function apiPostPublic<T>(path: string, body: unknown): Promise<{ ok: boolean; data?: T; error?: string }> {
  const apiBase = import.meta.env.PUBLIC_API_URL ?? "http://localhost:8787";

  try {
    const res = await fetch(`${apiBase}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await res.json();

    if (!res.ok || json.success === false) {
      return { ok: false, error: json.error ?? "Terjadi kesalahan." };
    }

    return { ok: true, data: json.data };
  } catch {
    return { ok: false, error: "Koneksi ke server gagal." };
  }
}