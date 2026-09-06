<script lang="ts">
  import { apiPost } from "../../lib/api-post";
  import LocationPicker from "./location-picker.svelte";
  import { Plus, Trash } from "phosphor-svelte";

  let { userPhone = "" } = $props();

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

  let communityUnitId = $state("");
  let relationship = $state("Anak Kandung");
  let familyPhone = $state("");

  $effect(() => {
    if (userPhone) {
      familyPhone = userPhone;
    }
  });

  let medications = $state<
    { conditionName: string; medicationName: string; dosage: string; frequency: string; timeOfDay: string; timingInstruction: string; reminderTime: string }[]
  >([]);

  let additionalFamily = $state<
    { name: string; phone: string; relationship: string; notifyViaWhatsapp: boolean }[]
  >([]);

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

  function addSibling() {
    additionalFamily = [...additionalFamily, { name: "", phone: "", relationship: "", notifyViaWhatsapp: true }];
  }

  function removeSibling(index: number) {
    additionalFamily = additionalFamily.filter((_, i) => i !== index);
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    errorMessage = "";

    if (!name || !age || !address || !rt || !rw) {
      errorMessage = "Lengkapi data identitas orang tua terlebih dahulu.";
      return;
    }

    if (!userPhone && !familyPhone) {
      errorMessage = "Nomor WhatsApp Anda diperlukan untuk menerima kabar darurat.";
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
      communityUnitId: communityUnitId || undefined,
      relationship,
      familyPhone: userPhone ? undefined : familyPhone,
      medications: medications.length > 0 ? medications : undefined,
      additionalFamily: additionalFamily.filter((f) => f.name && f.phone).length > 0
        ? additionalFamily.filter((f) => f.name && f.phone)
        : undefined,
    };

    const result = await apiPost<{ id: string }>("/api/family/elderly", payload);

    isSubmitting = false;

    if (!result.ok) {
      errorMessage = result.error ?? "Gagal mendaftarkan orang tua.";
      return;
    }

    window.location.href = "/family/dashboard";
  }
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-10">
  {#if errorMessage}
    <p class="rounded-2xl bg-red-500/10 text-red-600 px-5 py-3.5 text-[15px]">{errorMessage}</p>
  {/if}

  <!-- Identitas -->
  <section class="flex flex-col gap-4">
    <h2 class="text-[20px] font-semibold text-dark">Identitas Orang Tua</h2>

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

    <input bind:value={phone} type="tel" placeholder="Nomor WhatsApp orang tua (opsional jika pasif)"
      class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40" />

    <LocationPicker bind:address bind:latitude bind:longitude />

    <div class="grid grid-cols-2 gap-4">
      <input bind:value={rt} type="text" placeholder="RT" required
        class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40" />
      <input bind:value={rw} type="text" placeholder="RW" required
        class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40" />
    </div>

    <div>
      <label for="community-unit-id" class="text-[14px] text-dark/50 mb-1.5 block">
        Kode Wilayah RT (opsional — isi jika berbeda dari RT domisili akun Anda)
      </label>
      <input id="community-unit-id" bind:value={communityUnitId} type="text" placeholder="e.g. 3573051007-RW10-RT01"
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
        <p class="text-[13px] opacity-70 mt-0.5">Orang tua pegang WhatsApp sendiri</p>
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
      <label for="preferred-checkin-time" class="text-[14px] text-dark/50 mb-1.5 block">Jam Sapaan Harian</label>
      <input id="preferred-checkin-time" bind:value={preferredCheckinTime} type="time"
        class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40" />
    </div>
  </section>

  <!-- Riwayat Medis -->
  <section class="flex flex-col gap-4">
    <h2 class="text-[20px] font-semibold text-dark">Riwayat Medis & Obat</h2>

    <textarea bind:value={medicalHistory} placeholder="Diagnosa / riwayat penyakit" rows="2"
      class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40 resize-y"></textarea>

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
          <input bind:value={med.dosage} type="text" placeholder="Dosis"
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

  <!-- Kontak Anda -->
  <section class="flex flex-col gap-4">
    <h2 class="text-[20px] font-semibold text-dark">Kontak Anda (Kontak Utama)</h2>

    <select bind:value={relationship}
      class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40">
      <option value="Anak Kandung">Anak Kandung</option>
      <option value="Menantu">Menantu</option>
      <option value="Cucu">Cucu</option>
      <option value="Kerabat">Kerabat Lain</option>
    </select>

    {#if !userPhone}
      <input bind:value={familyPhone} type="tel" placeholder="Nomor WhatsApp Anda" required
        class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40" />
    {/if}
  </section>

  <!-- Saudara Lain -->
  <section class="flex flex-col gap-4">
    <h2 class="text-[20px] font-semibold text-dark">Kontak Saudara Lain (Opsional)</h2>

    {#each additionalFamily as sibling, i}
      <div class="rounded-3xl bg-light-darker p-5 flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <p class="text-[14px] font-medium text-dark/60">Saudara #{i + 1}</p>
          <button type="button" onclick={() => removeSibling(i)} class="text-red-500">
            <Trash weight="bold" class="size-4.5" />
          </button>
        </div>
        <input bind:value={sibling.name} type="text" placeholder="Nama saudara"
          class="w-full rounded-2xl bg-light px-4 py-2.5 text-[15px] outline-none" />
        <div class="grid grid-cols-2 gap-3">
          <input bind:value={sibling.phone} type="tel" placeholder="Nomor WhatsApp"
            class="w-full rounded-2xl bg-light px-4 py-2.5 text-[15px] outline-none" />
          <input bind:value={sibling.relationship} type="text" placeholder="Hubungan (Kakak, dsb)"
            class="w-full rounded-2xl bg-light px-4 py-2.5 text-[15px] outline-none" />
        </div>
      </div>
    {/each}

    <button type="button" onclick={addSibling}
      class="flex items-center justify-center gap-2 rounded-full bg-light-darker px-5 py-3 text-[15px] font-medium text-dark/60 hover:bg-light-darker/70 transition-colors">
      <Plus weight="bold" class="size-5" />
      Tambah Saudara
    </button>
  </section>

  <button type="submit" disabled={isSubmitting}
    class="w-full rounded-full bg-brand text-white px-6 py-4 text-[16px] font-semibold hover:bg-brand/90 transition-colors disabled:opacity-60">
    {isSubmitting ? "Mendaftarkan..." : "Daftarkan Orang Tua"}
  </button>
</form>