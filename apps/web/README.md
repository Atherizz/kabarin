# apps/web — Kabarin Frontend

Frontend workspace for the web application (Astro + SvelteKit).

## Getting Started

Initialize your frontend framework of choice in this directory, then configure your scripts and dependencies in `package.json`.

## Available Shared Packages

```ts
// Shared result pattern & types
import { ok, err, type Result } from "@kabarin/types";

// Better Auth client for frontend session handling
import { createKabarinAuthClient } from "@kabarin/auth/client";
const auth = createKabarinAuthClient(process.env.PUBLIC_API_URL || "http://localhost:3000");
```

## Environment Variables

```env
PUBLIC_API_URL=http://localhost:3000
```
