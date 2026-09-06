export async function getServerSession(request: Request) {
  const apiBase = import.meta.env.BETTER_AUTH_URL ?? "https://kabarin-api.atherizz.dev";

  try {
    const cookie = request.headers.get("cookie") ?? "";
    const tokenMatch = cookie.match(/(?:__Secure-)?better-auth\.session_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;

    let forwardedCookie = cookie;
    if (token && !forwardedCookie.includes("__Secure-better-auth.session_token=")) {
      forwardedCookie = `${forwardedCookie ? forwardedCookie + "; " : ""}__Secure-better-auth.session_token=${token}`;
    }

    const res = await fetch(`${apiBase}/api/auth/get-session`, {
      headers: {
        cookie: forwardedCookie,
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
