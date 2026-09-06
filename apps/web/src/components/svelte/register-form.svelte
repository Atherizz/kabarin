<script lang="ts">
  import { onMount } from "svelte";
  import { CaretDown, CheckCircle, WarningCircle, CircleNotch } from "phosphor-svelte";
  import { apiPost } from "../../lib/api-post";

  let name = $state("");
  let email = $state("");
  let password = $state("");
  let phone = $state("");

  // Wilayah form state
  let province = $state("");
  let city = $state("");
  let district = $state("");
  let subdistrict = $state("");
  let subdistrictCode = $state("");
  let rw = $state("");
  let rt = $state("");

  // Cascading Wilayah API state
  const API_WILAYAH = "https://www.emsifa.com/api-wilayah-indonesia/api";

  interface WilayahItem {
    id: string;
    name: string;
  }

  let provinces = $state<WilayahItem[]>([]);
  let regencies = $state<WilayahItem[]>([]);
  let districts = $state<WilayahItem[]>([]);
  let villages = $state<WilayahItem[]>([]);

  let selectedProv = $state("");
  let selectedReg = $state("");
  let selectedDist = $state("");
  let selectedVill = $state("");

  let isLoadingProvinces = $state(false);
  let isLoadingRegencies = $state(false);
  let isLoadingDistricts = $state(false);
  let isLoadingVillages = $state(false);

  // Territory availability check state
  let isCheckingAvailability = $state(false);
  let availabilityStatus = $state<{ available: boolean; message: string } | null>(null);
  let checkDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  let healthFacilityName = $state("");
  let healthFacilityPhone = $state("");
  let communityHealthWorkerPhone = $state("");
  let ambulancePhone = $state("");

  let isSubmitting = $state(false);
  let errorMessage = $state("");

  function toTitleCase(str: string): string {
    if (!str) return "";
    return str
      .toLowerCase()
      .replace(/(?:^|\s|\/|-)\S/g, (char) => char.toUpperCase())
      .replace(/\bDki\b/g, "DKI")
      .replace(/\bDi\b/g, "DI");
  }

  onMount(async () => {
    isLoadingProvinces = true;
    try {
      const res = await fetch(`${API_WILAYAH}/provinces.json`);
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      provinces = await res.json();
    } catch (err) {
      console.error("Gagal memuat data provinsi", err);
      errorMessage = "Gagal memuat daftar provinsi. Silakan periksa koneksi internet Anda.";
    } finally {
      isLoadingProvinces = false;
    }
  });

  async function handleProvinceChange() {
    regencies = [];
    districts = [];
    villages = [];
    selectedReg = "";
    selectedDist = "";
    selectedVill = "";
    city = "";
    district = "";
    subdistrict = "";
    subdistrictCode = "";
    availabilityStatus = null;

    const provObj = provinces.find((p) => p.id === selectedProv);
    province = provObj ? toTitleCase(provObj.name) : "";

    if (!selectedProv) return;

    isLoadingRegencies = true;
    try {
      const res = await fetch(`${API_WILAYAH}/regencies/${selectedProv}.json`);
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      regencies = await res.json();
    } catch (err) {
      console.error("Gagal memuat data kota/kabupaten", err);
    } finally {
      isLoadingRegencies = false;
    }
  }

  async function handleRegencyChange() {
    districts = [];
    villages = [];
    selectedDist = "";
    selectedVill = "";
    district = "";
    subdistrict = "";
    subdistrictCode = "";
    availabilityStatus = null;

    const regObj = regencies.find((r) => r.id === selectedReg);
    city = regObj ? toTitleCase(regObj.name) : "";

    if (!selectedReg) return;

    isLoadingDistricts = true;
    try {
      const res = await fetch(`${API_WILAYAH}/districts/${selectedReg}.json`);
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      districts = await res.json();
    } catch (err) {
      console.error("Gagal memuat data kecamatan", err);
    } finally {
      isLoadingDistricts = false;
    }
  }

  async function handleDistrictChange() {
    villages = [];
    selectedVill = "";
    subdistrict = "";
    subdistrictCode = "";
    availabilityStatus = null;

    const distObj = districts.find((d) => d.id === selectedDist);
    district = distObj ? toTitleCase(distObj.name) : "";

    if (!selectedDist) return;

    isLoadingVillages = true;
    try {
      const res = await fetch(`${API_WILAYAH}/villages/${selectedDist}.json`);
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      villages = await res.json();
    } catch (err) {
      console.error("Gagal memuat data kelurahan/desa", err);
    } finally {
      isLoadingVillages = false;
    }
  }

  function handleVillageSelect() {
    const villObj = villages.find((v) => v.id === selectedVill);
    if (villObj) {
      subdistrict = toTitleCase(villObj.name);
      subdistrictCode = villObj.id;
    } else {
      subdistrict = "";
      subdistrictCode = "";
    }
    triggerAvailabilityCheck();
  }

  function triggerAvailabilityCheck() {
    if (checkDebounceTimer) clearTimeout(checkDebounceTimer);
    availabilityStatus = null;

    const cleanRw = rw.trim();
    const cleanRt = rt.trim();

    if (!subdistrictCode || !cleanRw || !cleanRt) {
      return;
    }

    checkDebounceTimer = setTimeout(async () => {
      isCheckingAvailability = true;
      try {
        const queryParams = new URLSearchParams({
          subdistrictCode,
          rw: cleanRw,
          rt: cleanRt,
        });
        const res = await fetch(`/api/community/check?${queryParams.toString()}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            availabilityStatus = {
              available: json.data.available,
              message: json.data.message,
            };
          }
        }
      } catch (err) {
        console.error("Gagal memeriksa ketersediaan RT:", err);
      } finally {
        isCheckingAvailability = false;
      }
    }, 400);
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    errorMessage = "";

    if (!name || !email || !password || !province || !city || !district || !subdistrict || !subdistrictCode || !rw || !rt) {
      errorMessage = "Lengkapi semua data wilayah dan akun yang wajib diisi.";
      return;
    }

    if (availabilityStatus && !availabilityStatus.available) {
      errorMessage = availabilityStatus.message;
      return;
    }

    isSubmitting = true;

    const payload = {
      name,
      email,
      password,
      phone: phone || undefined,
      province,
      city,
      district,
      subdistrict,
      subdistrictCode,
      rw,
      rt,
      healthFacilityName: healthFacilityName || undefined,
      healthFacilityPhone: healthFacilityPhone || undefined,
      communityHealthWorkerPhone: communityHealthWorkerPhone || undefined,
      ambulancePhone: ambulancePhone || undefined,
    };

    const result = await apiPost<{ community: { id: string } }>("/api/community/register", payload);

    isSubmitting = false;

    if (!result.ok) {
      errorMessage = result.error ?? "Registrasi gagal.";
      return;
    }

    window.location.href = "/dashboard";
  }
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-10">
  {#if errorMessage}
    <p class="rounded-2xl bg-red-500/10 text-red-600 px-5 py-3.5 text-[15px]">{errorMessage}</p>
  {/if}

  <!-- Wilayah RT -->
  <section class="flex flex-col gap-4">
    <h2 class="text-[20px] font-semibold text-dark">Wilayah RT</h2>

    <!-- Cascading Wilayah Selects -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Provinsi -->
      <div class="relative">
        <select
          bind:value={selectedProv}
          onchange={handleProvinceChange}
          class="w-full appearance-none rounded-3xl bg-light-darker pl-5 pr-12 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40 text-dark"
        >
          <option value="">{isLoadingProvinces ? "Memuat Provinsi..." : "Pilih Provinsi"}</option>
          {#each provinces as prov}
            <option value={prov.id}>{toTitleCase(prov.name)}</option>
          {/each}
        </select>
        <CaretDown weight="bold" class="absolute right-5 top-1/2 -translate-y-1/2 size-4 text-dark/40 pointer-events-none" />
      </div>

      <!-- Kota/Kabupaten -->
      <div class="relative">
        <select
          bind:value={selectedReg}
          onchange={handleRegencyChange}
          disabled={!selectedProv || isLoadingRegencies}
          class="w-full appearance-none rounded-3xl bg-light-darker pl-5 pr-12 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40 text-dark disabled:opacity-50"
        >
          <option value="">{isLoadingRegencies ? "Memuat Kota/Kabupaten..." : "Pilih Kota/Kabupaten"}</option>
          {#each regencies as reg}
            <option value={reg.id}>{toTitleCase(reg.name)}</option>
          {/each}
        </select>
        <CaretDown weight="bold" class="absolute right-5 top-1/2 -translate-y-1/2 size-4 text-dark/40 pointer-events-none" />
      </div>

      <!-- Kecamatan -->
      <div class="relative">
        <select
          bind:value={selectedDist}
          onchange={handleDistrictChange}
          disabled={!selectedReg || isLoadingDistricts}
          class="w-full appearance-none rounded-3xl bg-light-darker pl-5 pr-12 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40 text-dark disabled:opacity-50"
        >
          <option value="">{isLoadingDistricts ? "Memuat Kecamatan..." : "Pilih Kecamatan"}</option>
          {#each districts as dist}
            <option value={dist.id}>{toTitleCase(dist.name)}</option>
          {/each}
        </select>
        <CaretDown weight="bold" class="absolute right-5 top-1/2 -translate-y-1/2 size-4 text-dark/40 pointer-events-none" />
      </div>

      <!-- Kelurahan/Desa -->
      <div class="relative">
        <select
          bind:value={selectedVill}
          onchange={handleVillageSelect}
          disabled={!selectedDist || isLoadingVillages}
          class="w-full appearance-none rounded-3xl bg-light-darker pl-5 pr-12 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40 text-dark disabled:opacity-50"
        >
          <option value="">{isLoadingVillages ? "Memuat Kelurahan/Desa..." : "Pilih Kelurahan/Desa"}</option>
          {#each villages as vill}
            <option value={vill.id}>{toTitleCase(vill.name)}</option>
          {/each}
        </select>
        <CaretDown weight="bold" class="absolute right-5 top-1/2 -translate-y-1/2 size-4 text-dark/40 pointer-events-none" />
      </div>
    </div>

    <!-- RW & RT -->
    <div class="grid grid-cols-2 gap-4">
      <input
        bind:value={rw}
        oninput={triggerAvailabilityCheck}
        type="text"
        placeholder="RW (e.g. 10)"
        required
        class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40"
      />
      <input
        bind:value={rt}
        oninput={triggerAvailabilityCheck}
        type="text"
        placeholder="RT (e.g. 01)"
        required
        class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40"
      />
    </div>

    {#if subdistrictCode}
      <div class="flex items-center justify-between rounded-2xl bg-light-darker/60 px-5 py-3 text-[14px] text-dark/60">
        <span>Kode Kemendagri Kelurahan</span>
        <span class="font-mono font-medium text-dark">{subdistrictCode}</span>
      </div>
    {/if}

    {#if isCheckingAvailability}
      <div class="flex items-center gap-2 px-2 text-[14px] text-dark/50">
        <CircleNotch class="size-4 animate-spin text-brand" />
        <span>Memeriksa ketersediaan wilayah RT...</span>
      </div>
    {:else if availabilityStatus}
      <div
        class={`flex items-start gap-2.5 rounded-2xl px-4 py-3 text-[14px] ${
          availabilityStatus.available
            ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
            : "bg-amber-500/10 text-amber-800 border border-amber-500/20"
        }`}
      >
        {#if availabilityStatus.available}
          <CheckCircle weight="fill" class="size-5 shrink-0 text-emerald-600 mt-0.5" />
        {:else}
          <WarningCircle weight="fill" class="size-5 shrink-0 text-amber-600 mt-0.5" />
        {/if}
        <span>{availabilityStatus.message}</span>
      </div>
    {/if}
  </section>

  <!-- Akun Kader -->
  <section class="flex flex-col gap-4">
    <h2 class="text-[20px] font-semibold text-dark">Akun Kader / Ketua RT</h2>

    <input bind:value={name} type="text" placeholder="Nama lengkap" required
      class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40" />

    <input bind:value={phone} type="tel" placeholder="Nomor WhatsApp"
      class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40" />

    <input bind:value={email} type="email" placeholder="Email" required
      class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40" />

    <input bind:value={password} type="password" placeholder="Password (min. 8 karakter)" required minlength="8"
      class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40" />
  </section>

  <!-- Faskes (Opsional) -->
  <section class="flex flex-col gap-4">
    <h2 class="text-[20px] font-semibold text-dark">Kontak Fasilitas Kesehatan (Opsional)</h2>

    <input bind:value={healthFacilityName} type="text" placeholder="Nama Puskesmas/Faskes"
      class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40" />

    <div class="grid grid-cols-2 gap-4">
      <input bind:value={healthFacilityPhone} type="tel" placeholder="Telp. Faskes"
        class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40" />
      <input bind:value={communityHealthWorkerPhone} type="tel" placeholder="Telp. Bidan Desa"
        class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40" />
    </div>

    <input bind:value={ambulancePhone} type="tel" placeholder="Telp. Ambulans Siaga"
      class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40" />
  </section>

  <button
    type="submit"
    disabled={isSubmitting || (availabilityStatus !== null && !availabilityStatus.available)}
    class="w-full rounded-full bg-brand text-white px-6 py-4 text-[16px] font-semibold hover:bg-brand/90 transition-colors disabled:opacity-60"
  >
    {isSubmitting ? "Mendaftarkan RT..." : "Daftarkan RT & Buat Akun"}
  </button>
</form>
