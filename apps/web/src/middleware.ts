import { defineMiddleware } from "astro:middleware";

const PUBLIC_ROUTES = ["/login", "/register", "/register/family", "/lapor", "/"];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return next();
  }

  const apiBase = import.meta.env.PUBLIC_API_URL ?? "https://kabarin-api.atherizz.dev";

  const cookieHeader = context.request.headers.get("cookie") ?? "";
  const tokenMatch = cookieHeader.match(/(?:__Secure-)?better-auth\.session_token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : null;

  let forwardedCookie = cookieHeader;
  if (token && !forwardedCookie.includes("__Secure-better-auth.session_token=")) {
    forwardedCookie = `${forwardedCookie ? forwardedCookie + "; " : ""}__Secure-better-auth.session_token=${token}`;
  }

  const res = await fetch(`${apiBase}/api/auth/get-session`, {
    headers: {
      cookie: forwardedCookie,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = res.ok ? await res.json() : null;

  if (!data?.session) {
    return context.redirect("/login");
  }

  context.locals.session = data.session;
  context.locals.user = data.user;

  return next();
});
