import {
  buildEscalationContext,
  updateElderlyStatus,
  recordEscalationLog,
  type DispatchEscalationParams,
} from "./context";
import { dispatchTier1, dispatchTier2, dispatchTier3 } from "./tiers";

export async function dispatchEscalation(
  params: DispatchEscalationParams
): Promise<void> {
  const ctx = await buildEscalationContext(params);
  if (!ctx) return;

  await updateElderlyStatus(ctx);
  await recordEscalationLog(ctx);

  await dispatchTier1(ctx);
  if (ctx.tier === 2) await dispatchTier2(ctx);
  if (ctx.tier === 3) await dispatchTier3(ctx);
}

export * from "./context";
export * from "./tiers";
