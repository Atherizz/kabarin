import { createAuthClient } from "better-auth/client";

export function createKabarinAuthClient(baseURL: string) {
  return createAuthClient({ baseURL });
}

export type KabarinAuthClient = ReturnType<typeof createKabarinAuthClient>;
