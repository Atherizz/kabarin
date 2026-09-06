import { defineMiddleware } from "astro:middleware";

const GUEST_ONLY_ROUTES = ["/login", "/register", "/register/family"];
const PUBLIC_ROUTES = ["/lapor", "/", "/api", "/status"];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  const isGuestOnly = GUEST_ONLY_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  const cookieHeader = context.request.headers.get("cookie") ?? "";
  const tokenMatch = cookieHeader.match(/(?:__Secure-)?better-auth\.session_token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : null;

  let session = null;
  let user = null;

  if (token) {
    const apiBase = import.meta.env.BETTER_AUTH_URL ?? "https://kabarin-api.atherizz.dev";

    let forwardedCookie = cookieHeader;
    if (!forwardedCookie.includes("__Secure-better-auth.session_token=")) {
      forwardedCookie = `${forwardedCookie ? forwardedCookie + "; " : ""}__Secure-better-auth.session_token=${token}`;
    }

    try {
      const res = await fetch(`${apiBase}/api/auth/get-session`, {
        headers: {
          cookie: forwardedCookie,
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        const data = await res.json();
        session = data?.session ?? null;
        user = data?.user ?? null;
      }
    } catch (err) {
      console.error("Failed to verify session in middleware:", err);
    }
  }

  context.locals.session = session;
  context.locals.user = user;

  if (session && isGuestOnly) {
    return context.redirect("/");
  }

  if (isGuestOnly || isPublic) {
    return next();
  }

  if (!session) {
    return context.redirect("/login");
  }

  return next();
});