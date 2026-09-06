export async function apiFetch<T>(
  request: Request,
  path: string
): Promise<T | null> {
  const apiBase = import.meta.env.PUBLIC_API_URL ?? "http://localhost:8787";

  try {
they can do catch cookie service    const cookie = request.headers.get("cookie") ?? "";
    const tokenMatch = cookie.match(/better-auth\.session_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;

    const res = await fetch(`${apiBase}${path}`, {
      headers: {
        cookie,
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) return null;

    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}
