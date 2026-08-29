import {
  AuthenticationCreds,
  AuthenticationState,
  BufferJSON,
  initAuthCreds,
  proto,
  SignalDataSet,
  SignalDataTypeMap,
  SignalKeyStore,
} from "@whiskeysockets/baileys";
import { botAuthState, eq, inArray } from "@kabarin/db";
import type { AppDatabase } from "@kabarin/db";

/**
 * Custom Baileys Authentication State stored in PostgreSQL Neon.
 * This ensures sessions persist across restarts without re-scanning QR codes.
 */
export async function usePostgresAuthState(db: AppDatabase): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
  clearSession: () => Promise<void>;
}> {
  // 1. Helper to write/update a key as stringified JSON
  const writeData = async (key: string, data: any) => {
    if (data === null || data === undefined) {
      await db.delete(botAuthState).where(eq(botAuthState.key, key));
      return;
    }
    const serialized = JSON.stringify(data, BufferJSON.replacer);
    await db
      .insert(botAuthState)
      .values({
        key,
        value: serialized,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: botAuthState.key,
        set: {
          value: serialized,
          updatedAt: new Date(),
        },
      });
  };

  // 2. Helper to read a key
  const readData = async (key: string) => {
    const row = await db.query.botAuthState.findFirst({
      where: eq(botAuthState.key, key),
    });
    if (!row || !row.value) return null;
    return typeof row.value === "string"
      ? JSON.parse(row.value, BufferJSON.reviver)
      : JSON.parse(JSON.stringify(row.value), BufferJSON.reviver);
  };

  // 3. Load or initialize creds
  const credsData = await readData("creds");
  const creds: AuthenticationCreds = credsData || initAuthCreds();

  // 4. Implement SignalKeyStore for cryptographic session keys
  const keys: SignalKeyStore = {
    get: async <T extends keyof SignalDataTypeMap>(
      type: T,
      ids: string[]
    ): Promise<{ [id: string]: SignalDataTypeMap[T] }> => {
      const data: { [id: string]: SignalDataTypeMap[T] } = {};
      const dbKeys = ids.map((id) => `${type}-${id}`);
      if (dbKeys.length === 0) return data;

      const rows = await db.query.botAuthState.findMany({
        where: inArray(botAuthState.key, dbKeys),
      });

      const map = new Map(rows.map((r) => [r.key, r.value]));

      for (const id of ids) {
        const dbKey = `${type}-${id}`;
        const raw = map.get(dbKey);
        if (raw) {
          let value =
            typeof raw === "string"
              ? JSON.parse(raw, BufferJSON.reviver)
              : JSON.parse(JSON.stringify(raw), BufferJSON.reviver);
          if (type === "app-state-sync-key" && value) {
            value = proto.Message.AppStateSyncKeyData.fromObject(value);
          }
          data[id] = value as SignalDataTypeMap[T];
        }
      }

      return data;
    },
    set: async (data: SignalDataSet): Promise<void> => {
      const tasks: Promise<void>[] = [];
      for (const [category, entries] of Object.entries(data)) {
        if (entries) {
          for (const [id, value] of Object.entries(entries as Record<string, any>)) {
            const key = `${category}-${id}`;
            tasks.push(writeData(key, value));
          }
        }
      }
      await Promise.all(tasks);
    },
    clear: async (): Promise<void> => {
      await db.delete(botAuthState);
    },
  };

  return {
    state: {
      creds,
      keys,
    },
    saveCreds: async () => {
      await writeData("creds", creds);
    },
    clearSession: async () => {
      await db.delete(botAuthState);
    },
  };
}
