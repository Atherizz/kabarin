<script lang="ts">
  import { apiPostPublic } from "../../lib/api-post-public";
  import { Phone, Pill, Warning, CheckCircle } from "phosphor-svelte";

  interface Props {
    token: string;
    elderlyName: string;
    age: number;
    currentStatus: "green" | "yellow" | "red" | "grey";
    rt: string;
    rw: string;
    updatedAt: string;
    volunteerName?: string | null;
    volunteerPhone?: string | null;
  }

  let { token, currentStatus: initialStatus, updatedAt: initialUpdatedAt }: Props = $props();

  let currentStatus = $state(initialStatus);
  let updatedAt = $state(initialUpdatedAt);
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

    const result = await apiPostPublic<{ status: string }>(`/api/family/status/${token}/trigger`, {
      reason: "Ditekan manual dari halaman status keluarga",
    });

    isTriggering = false;

    if (!result.ok) {
      sosError = result.error ?? "Gagal mengirim sinyal darurat.";
      return;
    }

    currentStatus = "red";
    updatedAt = new Date().toISOString();
    sosMessage = "Sinyal darurat berhasil dikirim! Relawan dan Kader RT segera menerima notifikasi.";
  }
</script>

<div class="flex flex-col gap-4">
  {#if sosMessage}
    <div class="rounded-2xl bg-red-500/10 px-5 py-4 flex items-center gap-3">
      <Warning weight="fill" class="size-5 text-red-500 shrink-0" />
      <p class="text-[14px] text-red-600 font-medium">{sosMessage}</p>
    </div>
  {/if}

  {#if sosError}
    <p class="rounded-2xl bg-red-500/10 text-red-600 px-5 py-3.5 text-[14px]">{sosError}</p>
  {/if}

  <button
    onclick={triggerSos}
    disabled={isTriggering || currentStatus === "red"}
    class="w-full rounded-full bg-red-500 text-white px-6 py-4 text-[16px] font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
  >
    <Warning weight="fill" class="size-5" />
    {currentStatus === "red" ? "Status Darurat Aktif" : isTriggering ? "Mengirim..." : "Minta Bantuan Relawan Cek Sekarang"}
  </button>
</div>