import { z } from "./zod-extended";

// Discriminated union — prefer this over throw/try-catch in service layer
export type Result<T, E = ServiceError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export type ServiceErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "VALIDATION"
  | "CONFLICT"
  | "INTERNAL";

export type ServiceError = {
  code: ServiceErrorCode;
  message: string;
};

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const err = (code: ServiceErrorCode, message: string): Result<never> => ({
  ok: false,
  error: { code, message },
});
