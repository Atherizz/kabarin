export async function apiFetchPublic<T>(path: string): Promise<T | null> {
  const apiBase = import.meta.env.BETTER_AUTH_URL ?? "https://kabarin-api.atherizz.dev";

  try {
    const res = await fetch(`${apiBase}${path}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}