export async function apiPost<T>(path: string, body: unknown): Promise<{ ok: boolean; data?: T; error?: string }> {
  const apiBase = import.meta.env.PUBLIC_API_URL ?? "https://kabarin-api.atherizz.dev";

  try {
    const endpoint =
      typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
        ? path
        : `${apiBase}${path}`;

    const res = await fetch(endpoint, {
      method: "POST",
      credentials: "include",
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
