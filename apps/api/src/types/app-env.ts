import type { AppDatabase } from "@kabarin/db";
import type { AuthInstance, AuthSession } from "@kabarin/auth";

export type AppEnv = {
  Bindings: {
    ENVIRONMENT?: string;
    NODE_ENV?: string;
    DATABASE_URL: string;
    BETTER_AUTH_URL: string;
    BETTER_AUTH_SECRET: string;
    TRUSTED_ORIGINS?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    // R2 Storage
    R2_ACCOUNT_ID?: string;
    R2_ACCESS_KEY_ID?: string;
    R2_SECRET_ACCESS_KEY?: string;
    R2_BUCKET_NAME?: string;
    R2_PUBLIC_URL?: string;
    // Azure OpenAI (Care Agent & Smart OCR)
    AZURE_OPENAI_API_KEY?: string;
    AZURE_OPENAI_ENDPOINT?: string;
    AZURE_OPENAI_DEPLOYMENT_NAME?: string;
    // Azure Whisper STT (voice note transcription in bot)
    WHISPER_ENDPOINT?: string;
    // WhatsApp Bot (Baileys — runs as separate Bun process)
    WA_BOT_PHONE?: string;
    WA_BAILEYS_SESSION?: string;
  };
  Variables: {
    db: AppDatabase;
    auth: AuthInstance;
    session: AuthSession | null;
  };
};
