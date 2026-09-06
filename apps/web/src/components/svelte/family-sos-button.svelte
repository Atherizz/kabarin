<script lang="ts">
  import { apiPost } from "../../lib/api-post";
  import { Warning } from "phosphor-svelte";

  interface Props {
    elderlyId: string;
    elderlyName: string;
    currentStatus: "green" | "yellow" | "red" | "grey";
  }

  let { elderlyId, elderlyName, currentStatus: initialStatus }: Props = $props();

  let currentStatus = $state(initialStatus);
  let isTriggering = $state(false);
  let sosMessage = $state("");
  let sosError = $state("");

  async function triggerSos() {
    if (currentStatus === "red") {
      sosMessage = "Status darurat sudah aktif. Relawan sedang dalam perjalanan.";
      return;
    }
    
    isTriggering = true;
    sosError = "";
    
    const result = await apiPost<{ status: string }>('/api/family/trigger-sos', {
      elderlyId: elderlyId,
      reason: "Dikirim dari Dashboard Keluarga",
    });
    
    isTriggering = false;
    
    if (!result || !result.success) {
      sosError = result?.error ?? "Gagal mengirim sinyal darurat.";
      return;
    }
    
    currentStatus = "red";
    sosMessage = `Sinyal darurat untuk ${elderlyName} berhasil dikirim! Relawan dan Kader RT segera menerima notifikasi.`;
  }
</script>

<div class="flex flex-col gap-2">
  {#if sosMessage}
    <p class="text-[13px] text-red-600 bg-red-500/10 rounded-xl px-3 py-2">{sosMessage}</p>
  {/if}
  {#if sosError}
    <p class="text-[13px] text-red-600 bg-red-500/10 rounded-xl px-3 py-2">{sosError}</p>
  {/if}
  <button
    type="button"
    onclick={triggerSos}
    disabled={isTriggering || currentStatus === "red"}
    class="w-full rounded-full border border-red-500/30 text-red-600 text-[13px] font-semibold px-4 py-2.5 hover:bg-red-500/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
  >
    <Warning weight="fill" class="size-4" />
    {currentStatus === "red"
      ? "Status Darurat Aktif"
      : isTriggering
        ? "Mengirim..."
        : "Kirim Kabar Sekarang"}
  </button>
</div>