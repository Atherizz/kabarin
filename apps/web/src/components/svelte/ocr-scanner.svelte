<script lang="ts">
  import { uploadImageAndGetUrl } from "../../lib/api-upload";
  import { runMedicationOcr } from "../../lib/api-ocr";
  import { Camera, CircleNotch, CheckCircle, Warning } from "phosphor-svelte";

 interface OcrMedication {
    conditionName: string;
    medicationName: string;
    dosage: string;
    frequency: string;
    timeOfDay: string;
    timingInstruction: string;
    reminderTime: string;
  }

  interface Props {
    elderlyId: string;
    onExtracted: (meds: OcrMedication[]) => void;
  }

  let { elderlyId, onExtracted }: Props = $props();

  let fileInput: HTMLInputElement;
  let previewUrl = $state<string | null>(null);
  let status = $state<"idle" | "uploading" | "scanning" | "done" | "error">("idle");
  let errorMessage = $state("");
  let extractedCount = $state(0);

  function triggerFileSelect() {
    fileInput?.click();
  }

  async function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    errorMessage = "";
    previewUrl = URL.createObjectURL(file);
    status = "uploading";

    const uploadResult = await uploadImageAndGetUrl(file, "prescription");

    if (!uploadResult.ok || !uploadResult.imageUrl) {
      status = "error";
      errorMessage = uploadResult.error ?? "Gagal mengunggah foto resep.";
      return;
    }

    status = "scanning";

    const ocrResult = await runMedicationOcr(uploadResult.imageUrl);

    if (!ocrResult.ok || !ocrResult.medications) {
      status = "error";
      errorMessage = ocrResult.error ?? "Gagal membaca resep dari foto.";
      return;
    }

    extractedCount = ocrResult.medications.length;
    status = "done";
    onExtracted(ocrResult.medications);
  }
</script>

<div class="rounded-3xl bg-brand/5 border border-dashed border-brand/30 p-6 flex flex-col items-center gap-4 text-center">
  <input
    bind:this={fileInput}
    type="file"
    accept="image/*"
    capture="environment"
    onchange={handleFileChange}
    class="hidden"
  />

  {#if previewUrl}
    <img src={previewUrl} alt="Pratinjau resep" class="w-full max-w-xs rounded-2xl object-cover max-h-48" />
  {/if}

  {#if status === "idle"}
    <Camera weight="fill" class="size-10 text-brand" />
    <div>
      <p class="text-[16px] font-semibold text-dark">Pindai Resep Obat</p>
      <p class="text-[14px] text-dark/50 mt-0.5">Ambil foto resep atau label obat untuk mengisi jadwal secara otomatis.</p>
    </div>
    <button
      type="button"
      onclick={triggerFileSelect}
      class="rounded-full bg-brand text-white px-6 py-3 text-[15px] font-medium hover:bg-brand/90 transition-colors"
    >
      Ambil / Unggah Foto
    </button>
  {:else if status === "uploading"}
    <CircleNotch weight="bold" class="size-8 text-brand animate-spin" />
    <p class="text-[15px] font-medium text-dark">Mengunggah foto...</p>
  {:else if status === "scanning"}
    <CircleNotch weight="bold" class="size-8 text-brand animate-spin" />
    <p class="text-[15px] font-medium text-dark">Membaca resep dengan AI...</p>
  {:else if status === "done"}
    <CheckCircle weight="fill" class="size-8 text-green-500" />
    <p class="text-[15px] font-medium text-dark">
      {extractedCount} obat berhasil dibaca! Cek dan sesuaikan di bawah.
    </p>
    <button
      type="button"
      onclick={triggerFileSelect}
      class="text-[14px] font-medium text-brand hover:underline"
    >
      Pindai foto lain
    </button>
  {:else if status === "error"}
    <Warning weight="fill" class="size-8 text-red-500" />
    <p class="text-[15px] font-medium text-red-600">{errorMessage}</p>
    <button
      type="button"
      onclick={triggerFileSelect}
      class="rounded-full bg-brand text-white px-6 py-3 text-[15px] font-medium hover:bg-brand/90 transition-colors"
    >
      Coba Lagi
    </button>
  {/if}
</div>