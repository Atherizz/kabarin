import { z } from "./zod-extended";

export const RiskCategoryEnum = z.enum(["rendah", "sedang", "tinggi"]);
export type RiskCategory = z.infer<typeof RiskCategoryEnum>;

export const RiskDimensionBreakdownSchema = z.object({
  score: z.number().min(0).max(100),
  note: z.string(),
});

export const RiskScoreBreakdownSchema = z.object({
  MA: RiskDimensionBreakdownSchema,
  RP: RiskDimensionBreakdownSchema,
  SB: RiskDimensionBreakdownSchema,
  PHE: RiskDimensionBreakdownSchema,
  M: RiskDimensionBreakdownSchema,
});

export const RiskScoreResultSchema = z.object({
  elderlyId: z.string(),
  elderlyName: z.string(),
  totalScore: z.number().min(0).max(100),
  category: RiskCategoryEnum,
  breakdown: RiskScoreBreakdownSchema,
  xaiNarrative: z.string().nullable(),
  computedAt: z.string(),
});

export type RiskDimensionBreakdown = z.infer<typeof RiskDimensionBreakdownSchema>;
export type RiskScoreBreakdown = z.infer<typeof RiskScoreBreakdownSchema>;
export type RiskScoreResult = z.infer<typeof RiskScoreResultSchema>;
