<script lang="ts">
  import { apiPost } from "../../lib/api-post";
  import OcrScanner from "./ocr-scanner.svelte";
  import { Plus, Trash, PencilSimple, Check, X } from "phosphor-svelte";

  interface Medication {
    id?: string;
    conditionName: string;
    medicationName: string;
    dosage: string;
    frequency: string;
    timeOfDay: string;
    timingInstruction: string;
    reminderTime: string;
    isActive?: boolean;
  }

  interface Props {
    elderlyId: string;
    initialMedications?: Medication[];
  }

  let { elderlyId, initialMedications = [] }: Props = $props();

  // FIX 1: Safely clone Astro's proxy objects without crashing the browser
  let medications = $state<Medication[]>(JSON.parse(JSON.stringify(initialMedications)));
  let editingIndex = $state<number | null>(null);
  let savingIndex = $state<number | null>(null);
  let errorMessage = $state("");

  const apiBase = import.meta.env.BETTER_AUTH_URL ?? "https://kabarin-api.atherizz.dev";

  async function handleOcrExtracted(newMeds: Medication[]) {
    errorMessage = "";

    for (const med of newMeds) {
      const result = await apiPost<Medication>(`/api/elderly/${elderlyId}/medications`, {
        ...med,
        isActive: true,
      });

      if (result.ok && result.data?.id) {
        medications = [...medications, { ...med, id: result.data.id }];
      } else {
        medications = [...medications, med];
        if (result.error) {
          errorMessage = `Sebagian obat gagal disimpan otomatis: ${result.error}`;
        }
      }
    }
  }

  function addBlankMedication() {
    medications = [
      ...medications,
      {
        conditionName: "",
        medicationName: "",
        dosage: "",
        frequency: "1x sehari",
        timeOfDay: "pagi",
        timingInstruction: "setelah makan",
        reminderTime: "07:00",
        isActive: true,
      },
    ];
    editingIndex = medications.length - 1;
  }

  async function saveMedication(index: number) {
    errorMessage = "";
    savingIndex = index;
    const med = medications[index];

    try {
      if (med.id) {
        const res = await fetch(`${apiBase}/api/elderly/${elderlyId}/medications/${med.id}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(med),
        });
        const json = await res.json();
        if (!res.ok || json.success === false) {
          throw new Error(json.error ?? "Gagal menyimpan perubahan obat.");
        }
      } else {
        const result = await apiPost<Medication>(`/api/elderly/${elderlyId}/medications`, med);
        if (!result.ok) throw new Error(result.error ?? "Gagal menambahkan obat.");
        if (result.data?.id) {
          medications[index] = { ...med, id: result.data.id };
        }
      }
      editingIndex = null;
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Gagal menyimpan obat.";
    } finally {
      savingIndex = null;
    }
  }

  async function deleteMedication(index: number) {
    const med = medications[index];
    errorMessage = "";

    if (!med.id) {
      medications = medications.filter((_, i) => i !== index);
      return;
    }

    try {
      const res = await fetch(`${apiBase}/api/elderly/${elderlyId}/medications/${med.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.error ?? "Gagal menghapus obat.");
      }
      medications = medications.filter((_, i) => i !== index);
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Gagal menghapus obat.";
    }
  }
</script>

<div class="flex flex-col gap-6">
  {#if errorMessage}
    <p class="rounded-2xl bg-red-500/10 text-red-600 px-5 py-3.5 text-[15px]">{errorMessage}</p>
  {/if}

  <!-- FIX 2: Pass the elderlyId prop to prevent the child component from crashing -->
  <OcrScanner onExtracted={handleOcrExtracted} elderlyId={elderlyId} />

  <div class="flex flex-col gap-3.5">
    {#each medications as med, i}
      <div class="rounded-3xl bg-light-darker p-5 flex flex-col gap-3">
        {#if editingIndex === i}
          <input bind:value={med.medicationName} type="text" placeholder="Nama obat"
            class="w-full rounded-2xl bg-light px-4 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-brand/40" />
          <input bind:value={med.conditionName} type="text" placeholder="Untuk kondisi (e.g. Hipertensi)"
            class="w-full rounded-2xl bg-light px-4 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-brand/40" />
          <div class="grid grid-cols-2 gap-3">
            <input bind:value={med.dosage} type="text" placeholder="Dosis"
              class="w-full rounded-2xl bg-light px-4 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-brand/40" />
            <input bind:value={med.reminderTime} type="time"
              class="w-full rounded-2xl bg-light px-4 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-brand/40" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <input bind:value={med.frequency} type="text" placeholder="Frekuensi (e.g. 2x sehari)"
              class="w-full rounded-2xl bg-light px-4 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-brand/40" />
            <input bind:value={med.timingInstruction} type="text" placeholder="Aturan (e.g. setelah makan)"
              class="w-full rounded-2xl bg-light px-4 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-brand/40" />
          </div>
          <div class="flex items-center gap-2 justify-end pt-2">
            <button
              type="button"
              onclick={() => (editingIndex = null)}
              class="flex items-center gap-1.5 rounded-full px-4 py-2 text-[14px] font-medium text-dark/50 hover:bg-light transition-colors"
            >
              <X weight="bold" class="size-4" />
              Batal
            </button>
            <button
              type="button"
              onclick={() => saveMedication(i)}
              disabled={savingIndex === i}
              class="flex items-center gap-1.5 rounded-full bg-brand text-white px-5 py-2 text-[14px] font-medium hover:bg-brand/90 transition-colors disabled:opacity-60"
            >
              <Check weight="bold" class="size-4" />
              {savingIndex === i ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        {:else}
          <div class="flex items-center justify-between">
            <div>
              <p class="font-semibold text-[16px] text-dark">{med.medicationName || "Obat baru"}</p>
              <p class="text-[14px] text-dark/50 mt-0.5">{med.dosage} · {med.frequency} · {med.reminderTime}</p>
              {#if med.conditionName}
                <p class="text-[13px] text-dark/40 mt-0.5">Untuk: {med.conditionName}</p>
              {/if}
              {#if !med.id}
                <p class="text-[12px] text-accent font-medium mt-1">Belum tersimpan</p>
              {/if}
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onclick={() => (editingIndex = i)}
                class="flex items-center justify-center size-9 rounded-full hover:bg-light transition-colors text-dark/50"
              >
                <PencilSimple weight="bold" class="size-4.5" />
              </button>
              <button
                type="button"
                onclick={() => deleteMedication(i)}
                class="flex items-center justify-center size-9 rounded-full hover:bg-red-500/10 transition-colors text-red-500"
              >
                <Trash weight="bold" class="size-4.5" />
              </button>
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <button
    type="button"
    onclick={addBlankMedication}
    class="flex items-center justify-center gap-2 rounded-full border border-dark/10 bg-white px-5 py-3.5 text-[15px] font-medium text-dark hover:bg-light transition-colors"
  >
    <Plus weight="bold" class="size-5" />
    Tambah Obat Manual
  </button>
</div>