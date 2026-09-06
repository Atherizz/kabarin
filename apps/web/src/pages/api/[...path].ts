import type { APIRoute } from "astro";

export const ALL: APIRoute = async ({ request, params }) => {
  const apiBase = import.meta.env.PUBLIC_API_URL ?? "https://kabarin-api.atherizz.dev";
  const path = params.path ?? "";
  const url = new URL(request.url);
  const targetUrl = `${apiBase}/api/${path}${url.search}`;

  const reqHeaders = new Headers(request.headers);
  reqHeaders.delete("host");

  const rawReqCookie = reqHeaders.get("cookie");
  if (rawReqCookie && !rawReqCookie.includes("__Secure-better-auth.session_token=") && rawReqCookie.includes("better-auth.session_token=")) {
    reqHeaders.set("cookie", `${rawReqCookie}; ${rawReqCookie.replace(/better-auth\.session_token=/g, "__Secure-better-auth.session_token=")}`);
  }

  const res = await fetch(targetUrl, {
    method: request.method,
    headers: reqHeaders,
    body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
    redirect: "manual",
  });

  const resHeaders = new Headers(res.headers);

  // For localhost dev, rewrite cookie attributes so browser accepts them on HTTP localhost
  const host = request.headers.get("host") || "";
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1");

  if (isLocal) {
    const rawCookies =
      typeof res.headers.getSetCookie === "function"
        ? res.headers.getSetCookie()
        : [res.headers.get("set-cookie")].filter(Boolean);

    resHeaders.delete("set-cookie");
    for (const cookieStr of rawCookies) {
      if (!cookieStr) continue;
      const cleaned = cookieStr
        .replace(/Domain=[^;]+;?\s*/gi, "")
        .replace(/;\s*Secure/gi, "")
        .replace(/__Secure-/gi, "");
      resHeaders.append("set-cookie", cleaned);
    }
  }

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: resHeaders,
  });
};
