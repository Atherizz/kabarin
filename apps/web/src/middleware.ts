import { defineMiddleware } from "astro:middleware";

const PUBLIC_ROUTES = ["/login", "/register", "/lapor"];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return next();
  }

  const apiBase = import.meta.env.PUBLIC_API_URL ?? "http://localhost:8787";

  const res = await fetch(`${apiBase}/api/auth/get-session`, {
    headers: { cookie: context.request.headers.get("cookie") ?? "" },
  });
  
  const data = res.ok ? await res.json() : null;
  
  if (!data?.session) {
    return context.redirect("/login");
  }

  context.locals.session = data.session;
  context.locals.user = data.user;

  return next();
});
