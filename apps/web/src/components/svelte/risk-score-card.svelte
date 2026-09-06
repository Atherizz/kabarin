<script lang="ts">
  import { Info, ChartBar } from "phosphor-svelte";

  let { data }: { 
    data: {
      elderlyId: string;
      elderlyName: string;
      totalScore: number;
      category: "rendah" | "sedang" | "tinggi";
      breakdown: Record<string, { score: number; note: string }>;
      xaiNarrative: string | null;
      computedAt: string;
    }
  } = $props();

  const dimensionMap: Record<string, string> = {
    MA: "Kepatuhan Obat",
    RP: "Pola Respons",
    SB: "Aktivitas Sosial",
    PHE: "Keluhan Fisik",
    M: "Kondisi Medis"
  };

  const theme = $derived.by(() => {
    switch (data.category.toLowerCase()) {
      case "tinggi": return { color: "text-red-600", bg: "bg-red-500/10", bar: "bg-red-500" };
      case "sedang": return { color: "text-amber-600", bg: "bg-amber-500/10", bar: "bg-amber-500" };
      default: return { color: "text-emerald-600", bg: "bg-emerald-500/10", bar: "bg-emerald-500" };
    }
  });
</script>

<div class="flex flex-col gap-4">
  <div class="rounded-[28px] border border-dark/5 bg-white p-6 shadow-sm flex flex-col gap-6">
    <!-- Header -->
    <div class="flex items-start justify-between gap-4">
      <div>
        <h3 class="text-[17px] font-semibold text-dark">Indeks Kerentanan (AI)</h3>
        <p class="text-[13px] text-dark/50 mt-1">Diperbarui {new Date(data.computedAt).toLocaleDateString('id-ID')}</p>
      </div>
      <div class={`flex items-center gap-2 rounded-2xl px-4 py-2 ${theme.bg}`}>
        <span class={`text-[24px] font-bold ${theme.color}`}>{data.totalScore}</span>
        <span class={`text-[12px] font-semibold uppercase tracking-wider ${theme.color} opacity-70 pt-1`}>/ 100</span>
      </div>
    </div>

    <!-- AI Narrative -->
    {#if data.xaiNarrative}
      <div class="rounded-2xl bg-light-darker p-4 flex gap-3">
        <Info weight="fill" class="size-5 shrink-0 text-brand" />
        <p class="text-[14px] text-dark/70 leading-relaxed">{data.xaiNarrative}</p>
      </div>
    {/if}

    <!-- Dimension Breakdown -->
    <div class="flex flex-col gap-5 pt-2">
      {#each Object.entries(data.breakdown) as [key, detail]}
        <div class="flex flex-col gap-2">
          <div class="flex justify-between items-center text-[14px]">
            <span class="font-medium text-dark">{dimensionMap[key] || key}</span>
            <span class="font-semibold text-dark/50">{detail.score}/100</span>
          </div>
          <div class="h-1.5 w-full bg-dark/5 rounded-full overflow-hidden">
            <div 
              class={`h-full rounded-full transition-all duration-700 ease-out ${theme.bar}`} 
              style="width: {detail.score}%"
            ></div>
          </div>
          {#if detail.note}
            <p class="text-[13px] text-dark/40">{detail.note}</p>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div>