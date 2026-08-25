import { z } from "@kabarin/types";

export const storageRegistry = {
  prescription: {
    folder: "prescriptions",
    getPath: (ext: string) => `prescriptions/${crypto.randomUUID()}.${ext}`,
    mime: z.enum([
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ]),
    maxSize: 10 * 1024 * 1024, // 10MB
  },
  visitPhoto: {
    folder: "visits",
    getPath: (ext: string) => `visits/${crypto.randomUUID()}.${ext}`,
    mime: z.enum([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]),
    maxSize: 5 * 1024 * 1024, // 5MB
  },
  voiceNote: {
    folder: "voice",
    getPath: (ext: string) => `voice/${crypto.randomUUID()}.${ext}`,
    mime: z.enum([
      "audio/ogg",
      "audio/opus",
      "audio/mpeg",
      "audio/mp4",
      "audio/webm",
      "audio/wav",
    ]),
    maxSize: 10 * 1024 * 1024, // 10MB
  },
  chatMedia: {
    folder: "chat",
    getPath: (ext: string) => `chat/${crypto.randomUUID()}.${ext}`,
    mime: z.enum([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]),
    maxSize: 5 * 1024 * 1024, // 5MB
  },
} as const;

export type StorageRegistry = typeof storageRegistry;
export type StorageType = keyof StorageRegistry;

export function getFileExtension(fileName: string): string {
  const parts = fileName.split(".");
  if (parts.length > 1) {
    return parts.pop()!.toLowerCase();
  }
  return "jpg";
}
