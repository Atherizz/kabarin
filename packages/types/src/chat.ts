import { z } from "zod";

export const SenderTypeEnum = z.enum([
  "elderly",
  "bot",
  "volunteer",
  "family",
  "system",
]);

export const MessageTypeEnum = z.enum([
  "text",
  "voice",
  "image",
  "system_alert",
]);

export const ChatMessageSchema = z.object({
  id: z.string(),
  communityUnitId: z.string(),
  elderlyId: z.string().nullable().optional(),
  checkinSessionId: z.string().nullable().optional(),
  senderType: SenderTypeEnum,
  senderPhone: z.string().nullable().optional(),
  recipientPhone: z.string().nullable().optional(),
  messageType: MessageTypeEnum,
  content: z.string(),
  mediaUrl: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
  createdAt: z.string().datetime(),
});

export const CreateChatMessageInputSchema = z.object({
  communityUnitId: z.string().min(1),
  elderlyId: z.string().optional(),
  checkinSessionId: z.string().optional(),
  senderType: SenderTypeEnum,
  senderPhone: z.string().optional(),
  recipientPhone: z.string().optional(),
  messageType: MessageTypeEnum.default("text"),
  content: z.string().min(1),
  mediaUrl: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type SenderType = z.infer<typeof SenderTypeEnum>;
export type MessageType = z.infer<typeof MessageTypeEnum>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type CreateChatMessageInput = z.infer<typeof CreateChatMessageInputSchema>;
