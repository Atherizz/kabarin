<script lang="ts">
  import { apiPost } from "../../lib/api-post";
  import { Plus, Trash } from "phosphor-svelte";
  import LocationPicker from "./location-picker.svelte";

  interface VolunteerOption {
    id: string;
    name: string;
    address: string;
    maxCapacity: number;
    assignedElderlyCount: number;
    isActive: boolean;
  }

  let { volunteers = [] as VolunteerOption[] } = $props();

  let name = $state("");
  let phone = $state("");
  let age = $state<number | null>(null);
  let gender = $state<"male" | "female">("female");
  let address = $state("");
  let rt = $state("");
  let rw = $state("");
  let latitude = $state<number | null>(null);
  let longitude = $state<number | null>(null);
  let mobilityStatus = $state<"independent" | "needs_assistance" | "homebound">("independent");
  let monitoringMode = $state<"active" | "passive">("active");
  let medicalHistory = $state("");
  let preferredCheckinTime = $state("07:00");
  let notes = $state("");
  let primaryVolunteerId = $state("");
  let secondaryVolunteerId = $state("");

  interface Medication {
    conditionName: string;
    medicationName: string;
    dosage: string;
    frequency: string;
    timeOfDay: string;
    timingInstruction: string;
    reminderTime: string;
  }
  
  interface FamilyMember {
    name: string;
    phone: string;
    relationship: string;
    isPrimaryContact: boolean;
  }
  
  let medications = $state<Medication[]>([]);
  let family = $state<FamilyMember[]>([
    { name: "", phone: "", relationship: "", isPrimaryContact: true },
  ]);

  let isSubmitting = $state(false);
  let errorMessage = $state("");

  function addMedication() {
    medications = [
      ...medications,
      { conditionName: "", medicationName: "", dosage: "", frequency: "1x sehari", timeOfDay: "pagi", timingInstruction: "setelah makan", reminderTime: "07:00" },
    ];
  }

  function removeMedication(index: number) {
    medications = medications.filter((_, i) => i !== index);
  }

  function addFamily() {
    family = [...family, { name: "", phone: "", relationship: "", isPrimaryContact: false }];
  }

  function removeFamily(index: number) {
    family = family.filter((_, i) => i !== index);
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    errorMessage = "";

    if (!name || !age || !address || !rt || !rw) {
      errorMessage = "Lengkapi data identitas lansia terlebih dahulu.";
      return;
    }

    isSubmitting = true;

    const payload = {
      name,
      phone: phone || undefined,
      age,
      gender,
      address,
      rt,
      rw,
      latitude: latitude ?? undefined,
      longitude: longitude ?? undefined,
      mobilityStatus,
      monitoringMode,
      medicalHistory: medicalHistory || undefined,
      preferredCheckinTime,
      notes: notes || undefined,
      primaryVolunteerId: primaryVolunteerId || undefined,
      secondaryVolunteerId: secondaryVolunteerId || undefined,
      medications: medications.length > 0 ? medications : undefined,
      family: family.filter((f) => f.name && f.phone).length > 0
        ? family.filter((f) => f.name && f.phone)
        : undefined,
    };

    const result = await apiPost<{ id: string }>("/api/elderly", payload);

    isSubmitting = false;

    if (!result.ok) {
      errorMessage = result.error ?? "Gagal mendaftarkan lansia.";
      return;
    }

    window.location.href = `/elderly/${result.data?.id}`;
  }
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-10">
  {#if errorMessage}
    <p class="rounded-2xl bg-red-500/10 text-red-600 px-5 py-3.5 text-[15px]">{errorMessage}</p>
  {/if}

  <!-- Identitas -->
  <section class="flex flex-col gap-4">
    <h2 class="text-[20px] font-semibold text-dark">Identitas Lansia</h2>

    <input bind:value={name} type="text" placeholder="Nama lengkap" required
      class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40" />

    <div class="grid grid-cols-2 gap-4">
      <input bind:value={age} type="number" placeholder="Usia" required
        class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40" />
      <select bind:value={gender}
        class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40">
        <option value="female">Perempuan</option>
        <option value="male">Laki-laki</option>
      </select>
    </div>

    <input bind:value={phone} type="tel" placeholder="Nomor WhatsApp (opsional jika pasif)"
      class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40" />

    <LocationPicker bind:address bind:latitude bind:longitude />

    <div class="grid grid-cols-2 gap-4">
      <input bind:value={rt} type="text" placeholder="RT" required
        class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40" />
      <input bind:value={rw} type="text" placeholder="RW" required
        class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40" />
    </div>
  </section>

  <!-- Mode Pemantauan -->
  <section class="flex flex-col gap-4">
    <h2 class="text-[20px] font-semibold text-dark">Mode Pemantauan</h2>

    <div class="grid grid-cols-2 gap-3">
      <button type="button" onclick={() => (monitoringMode = "active")}
        class={`rounded-3xl px-5 py-4 text-left transition-colors ${monitoringMode === "active" ? "bg-brand text-white" : "bg-light-darker text-dark"}`}>
        <p class="font-semibold text-[15px]">Aktif</p>
        <p class="text-[13px] opacity-70 mt-0.5">Lansia pegang WhatsApp sendiri</p>
      </button>
      <button type="button" onclick={() => (monitoringMode = "passive")}
        class={`rounded-3xl px-5 py-4 text-left transition-colors ${monitoringMode === "passive" ? "bg-brand text-white" : "bg-light-darker text-dark"}`}>
        <p class="font-semibold text-[15px]">Pasif</p>
        <p class="text-[13px] opacity-70 mt-0.5">Homebound / tanpa HP</p>
      </button>
    </div>

    <select bind:value={mobilityStatus}
      class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40">
      <option value="independent">Mandiri</option>
      <option value="needs_assistance">Butuh Bantuan</option>
      <option value="homebound">Homebound</option>
    </select>

    <div>
      <label for="preferred-checkin-time" class="text-[14px] text-dark/50 mb-1.5 block">
        Jam Sapaan Harian
      </label>
      <input
        id="preferred-checkin-time"
        bind:value={preferredCheckinTime}
        type="time"
        class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40"
      />
    </div>
  </section>

  <!-- Riwayat Medis -->
  <section class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h2 class="text-[20px] font-semibold text-dark">Riwayat Medis & Obat</h2>
    </div>

    <textarea bind:value={medicalHistory} placeholder="Diagnosa / riwayat penyakit (e.g. Hipertensi, Riwayat Stroke)" rows="2"
      class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40 resize-y"></textarea>

    <p class="text-[13px] text-accent">
      📷 Pindai Resep Otomatis (Smart OCR) akan tersedia di sini — sementara isi manual di bawah.
    </p>

    {#each medications as med, i}
      <div class="rounded-3xl bg-light-darker p-5 flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <p class="text-[14px] font-medium text-dark/60">Obat #{i + 1}</p>
          <button type="button" onclick={() => removeMedication(i)} class="text-red-500">
            <Trash weight="bold" class="size-4.5" />
          </button>
        </div>
        <input bind:value={med.medicationName} type="text" placeholder="Nama obat"
          class="w-full rounded-2xl bg-light px-4 py-2.5 text-[15px] outline-none" />
        <div class="grid grid-cols-2 gap-3">
          <input bind:value={med.dosage} type="text" placeholder="Dosis (e.g. 1 tablet)"
            class="w-full rounded-2xl bg-light px-4 py-2.5 text-[15px] outline-none" />
          <input bind:value={med.reminderTime} type="time"
            class="w-full rounded-2xl bg-light px-4 py-2.5 text-[15px] outline-none" />
        </div>
      </div>
    {/each}

    <button type="button" onclick={addMedication}
      class="flex items-center justify-center gap-2 rounded-full bg-light-darker px-5 py-3 text-[15px] font-medium text-dark/60 hover:bg-light-darker/70 transition-colors">
      <Plus weight="bold" class="size-5" />
      Tambah Obat
    </button>
  </section>

  <!-- Kontak Keluarga -->
  <section class="flex flex-col gap-4">
    <h2 class="text-[20px] font-semibold text-dark">Kontak Keluarga</h2>

    {#each family as member, i}
      <div class="rounded-3xl bg-light-darker p-5 flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <p class="text-[14px] font-medium text-dark/60">Kontak #{i + 1}</p>
          {#if family.length > 1}
            <button type="button" onclick={() => removeFamily(i)} class="text-red-500">
              <Trash weight="bold" class="size-4.5" />
            </button>
          {/if}
        </div>
        <input bind:value={member.name} type="text" placeholder="Nama anak/kerabat"
          class="w-full rounded-2xl bg-light px-4 py-2.5 text-[15px] outline-none" />
        <div class="grid grid-cols-2 gap-3">
          <input bind:value={member.phone} type="tel" placeholder="Nomor WhatsApp"
            class="w-full rounded-2xl bg-light px-4 py-2.5 text-[15px] outline-none" />
          <input bind:value={member.relationship} type="text" placeholder="Hubungan (Anak, dsb)"
            class="w-full rounded-2xl bg-light px-4 py-2.5 text-[15px] outline-none" />
        </div>
      </div>
    {/each}

    <button type="button" onclick={addFamily}
      class="flex items-center justify-center gap-2 rounded-full bg-light-darker px-5 py-3 text-[15px] font-medium text-dark/60 hover:bg-light-darker/70 transition-colors">
      <Plus weight="bold" class="size-5" />
      Tambah Kontak
    </button>
  </section>

  <!-- Penugasan Relawan -->
  <section class="flex flex-col gap-4">
    <h2 class="text-[20px] font-semibold text-dark">Penugasan Relawan</h2>

    <select bind:value={primaryVolunteerId}
      class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40">
      <option value="">Pilih Relawan Utama (opsional)</option>
      {#each volunteers as v}
        <option value={v.id} disabled={v.assignedElderlyCount >= v.maxCapacity}>
          {v.name} — {v.address} ({v.assignedElderlyCount}/{v.maxCapacity} binaan{v.assignedElderlyCount >= v.maxCapacity ? ", penuh" : ""})
        </option>
      {/each}
    </select>

    <select bind:value={secondaryVolunteerId}
      class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40">
      <option value="">Pilih Relawan Cadangan (opsional)</option>
      {#each volunteers as v}
        <option value={v.id} disabled={v.assignedElderlyCount >= v.maxCapacity}>
          {v.name} — {v.address} ({v.assignedElderlyCount}/{v.maxCapacity} binaan{v.assignedElderlyCount >= v.maxCapacity ? ", penuh" : ""})
        </option>
      {/each}
    </select>
  </section>

  <button type="submit" disabled={isSubmitting}
    class="w-full rounded-full bg-brand text-white px-6 py-4 text-[16px] font-semibold hover:bg-brand/90 transition-colors disabled:opacity-60">
    {isSubmitting ? "Mendaftarkan..." : "Daftarkan Lansia"}
  </button>
</form>