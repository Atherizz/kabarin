export async function getServerSession(request: Request) {
  const apiBase = import.meta.env.PUBLIC_API_URL ?? "http://127.0.0.1:8787";

  try {
    const cookie = request.headers.get("cookie") ?? "";
    const tokenMatch = cookie.match(/better-auth\.session_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;

    const res = await fetch(`${apiBase}/api/auth/get-session`, {
      headers: {
        cookie,
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data?.session ? data : null;
  } catch {
    return null;
  }
}
