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

  interface CommunityInfo {
    subdistrictCode: string;
    rt: string;
    rw: string;
  }

  let { volunteers = [] as VolunteerOption[], communityDefaults = null as CommunityInfo | null } = $props();

  let name = $state("");
  let phone = $state("");
  let age = $state<number | null>(null);
  let gender = $state<"male" | "female">("female");
  let address = $state("");
  let rt = $state(communityDefaults?.rt ?? "");
  let rw = $state(communityDefaults?.rw ?? "");
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

    <LocationPicker
      bind:address
      bind:latitude
      bind:longitude
      autoLocate={false}
      prefill={communityDefaults ? { subdistrictCode: communityDefaults.subdistrictCode } : undefined}
    />

    <div class="grid grid-cols-2 gap-4">
      <input bind:value={rt} type="text" placeholder="RT" required
        class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40" />
      <input bind:value={rw} type="text" placeholder="RW" required
        class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40" />
    </div>
  </section>

  <!-- rest unchanged -->
</form>