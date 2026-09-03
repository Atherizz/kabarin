export async function getServerSession(request: Request) {
  const apiBase = import.meta.env.PUBLIC_API_URL ?? "http://127.0.0.1:8787";

  try {
    const res = await fetch(`${apiBase}/api/auth/get-session`, {
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data?.session ? data : null;
  } catch {
    return null;
  }
}
