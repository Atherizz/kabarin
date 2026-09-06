export async function apiFetchPublic<T>(path: string): Promise<T | null> {
  const apiBase = import.meta.env.PUBLIC_API_URL ?? "http://localhost:8787";

  try {
    const res = await fetch(`${apiBase}${path}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}