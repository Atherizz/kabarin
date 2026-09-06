<script lang="ts">
  import { apiPostPublic } from "../../lib/api-post-public";
  import { CheckCircle, Warning, SmileyMeh } from "phosphor-svelte";

  interface Medication {
    id: string;
    medicationName: string;
    dosage: string;
    reminderTime: string;
  }

  let { token, medications = [] as Medication[] } = $props();

  type Condition = "good" | "unwell" | "emergency";
  type Cause = "phone_off" | "not_home" | "sleeping" | "sick_or_fallen" | "other";

  let reportedCondition = $state<Condition | null>(null);
  let reportedCause = $state<Cause | null>(null);
  let medicationTaken = $state<boolean | null>(null);
  let volunteerNotes = $state("");
  let isSubmitting = $state(false);
  let errorMessage = $state("");
  let submitted = $state<{ elderlyStatus: string } | null>(null);

  const conditionOptions: { value: Condition; label: string; icon: any; tone: string }[] = [
    { value: "good", label: "Baik", icon: CheckCircle, tone: "green" },
    { value: "unwell", label: "Kurang Sehat", icon: SmileyMeh, tone: "yellow" },
    { value: "emergency", label: "Darurat", icon: Warning, tone: "red" },
  ];

  const causeOptions: { value: Cause; label: string }[] = [
    { value: "phone_off", label: "HP Mati" },
    { value: "not_home", label: "Tidak di Rumah" },
    { value: "sleeping", label: "Sedang Tidur" },
    { value: "sick_or_fallen", label: "Sakit / Jatuh" },
    { value: "other", label: "Lainnya" },
  ];

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    errorMessage = "";

    if (!reportedCondition) {
      errorMessage = "Pilih kondisi lansia terlebih dahulu.";
      return;
    }

    isSubmitting = true;

    const result = await apiPostPublic<{ elderlyStatus: string }>(
      `/api/visits/form/${token}/submit`,
      {
        reportedCondition,
        reportedCause: reportedCause ?? undefined,
        medicationTaken: medicationTaken ?? undefined,
        volunteerNotes: volunteerNotes || undefined,
      }
    );

    isSubmitting = false;

    if (!result.ok) {
      errorMessage = result.error ?? "Gagal mengirim laporan.";
      return;
    }

    submitted = result.data ?? null;
  }
</script>

{#if submitted}
  <div class="rounded-[28px] bg-green-500/10 p-7 flex flex-col items-center gap-3 text-center">
    <CheckCircle weight="fill" class="size-14 text-green-500" />
    <p class="text-[20px] font-semibold text-dark">Laporan Terkirim!</p>
    <p class="text-[15px] text-dark/60">
      Terima kasih atas kunjungannya. Status lansia telah diperbarui.
    </p>
  </div>
{:else}
  <form onsubmit={handleSubmit} class="flex flex-col gap-8">
    {#if errorMessage}
      <p class="rounded-2xl bg-red-500/10 text-red-600 px-5 py-3.5 text-[15px]">{errorMessage}</p>
    {/if}

    <section class="flex flex-col gap-3">
      <h2 class="text-[18px] font-semibold text-dark">Bagaimana kondisi lansia?</h2>
      <div class="grid grid-cols-3 gap-3">
        {#each conditionOptions as opt}
          <button
            type="button"
            onclick={() => (reportedCondition = opt.value)}
            class={`flex flex-col items-center gap-2 rounded-3xl px-3 py-5 transition-colors ${
              reportedCondition === opt.value
                ? opt.tone === "green" ? "bg-green-500 text-white"
                : opt.tone === "yellow" ? "bg-yellow-500 text-white"
                : "bg-red-500 text-white"
                : "bg-light-darker text-dark/60"
            }`}
          >
            <opt.icon weight="fill" class="size-8" />
            <span class="text-[14px] font-medium">{opt.label}</span>
          </button>
        {/each}
      </div>
    </section>

    {#if reportedCondition && reportedCondition !== "good"}
      <section class="flex flex-col gap-3">
        <h2 class="text-[18px] font-semibold text-dark">Apa penyebab kendala?</h2>
        <div class="flex flex-wrap gap-2.5">
          {#each causeOptions as opt}
            <button
              type="button"
              onclick={() => (reportedCause = opt.value)}
              class={`rounded-full px-5 py-2.5 text-[14px] font-medium transition-colors ${
                reportedCause === opt.value ? "bg-brand text-white" : "bg-light-darker text-dark/60"
              }`}
            >
              {opt.label}
            </button>
          {/each}
        </div>
      </section>
    {/if}

    {#if medications.length > 0}
      <section class="flex flex-col gap-3">
        <h2 class="text-[18px] font-semibold text-dark">Checklist Obat Harian</h2>
        {#each medications as med}
          <div class="rounded-2xl bg-light-darker px-5 py-3.5 flex items-center justify-between">
            <div>
              <p class="text-[15px] font-medium text-dark">{med.medicationName}</p>
              <p class="text-[13px] text-dark/50">{med.dosage} · {med.reminderTime}</p>
            </div>
          </div>
        {/each}
        <label class="flex items-center gap-3 mt-1">
          <input type="checkbox" bind:checked={medicationTaken} class="size-5 accent-brand" />
          <span class="text-[15px] text-dark/70">Obat sudah diminum sesuai jadwal</span>
        </label>
      </section>
    {/if}

    <section class="flex flex-col gap-3">
      <h2 class="text-[18px] font-semibold text-dark">Catatan Tambahan (Opsional)</h2>
      <textarea bind:value={volunteerNotes} rows="3" placeholder="Tulis observasi tambahan di sini..."
        class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40 resize-y"></textarea>
    </section>

    <button type="submit" disabled={isSubmitting}
      class="w-full rounded-full bg-brand text-white px-6 py-4 text-[16px] font-semibold hover:bg-brand/90 transition-colors disabled:opacity-60">
      {isSubmitting ? "Mengirim..." : "Kirim Laporan"}
    </button>
  </form>
{/if}