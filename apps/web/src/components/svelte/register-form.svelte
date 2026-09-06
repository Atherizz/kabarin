<script lang="ts">
  import { apiPost } from "../../lib/api-post";

  let name = $state("");
  let email = $state("");
  let password = $state("");
  let phone = $state("");

  let province = $state("");
  let city = $state("");
  let district = $state("");
  let subdistrict = $state("");
  let subdistrictCode = $state("");
  let rw = $state("");
  let rt = $state("");

  let healthFacilityName = $state("");
  let healthFacilityPhone = $state("");
  let communityHealthWorkerPhone = $state("");
  let ambulancePhone = $state("");

  let isSubmitting = $state(false);
  let errorMessage = $state("");

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    errorMessage = "";

    if (!name || !email || !password || !province || !city || !district || !subdistrict || !subdistrictCode || !rw || !rt) {
      errorMessage = "Lengkapi semua data wilayah dan akun yang wajib diisi.";
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

  <!-- Wilayah -->
  <section class="flex flex-col gap-4">
    <h2 class="text-[20px] font-semibold text-dark">Wilayah RT</h2>

    <input bind:value={province} type="text" placeholder="Provinsi (e.g. Jawa Timur)" required
      class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40" />

    <input bind:value={city} type="text" placeholder="Kota/Kabupaten (e.g. Kota Malang)" required
      class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40" />

    <input bind:value={district} type="text" placeholder="Kecamatan (e.g. Lowokwaru)" required
      class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40" />

    <div class="grid grid-cols-2 gap-4">
      <input bind:value={subdistrict} type="text" placeholder="Kelurahan/Desa" required
        class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40" />
      <input bind:value={subdistrictCode} type="text" placeholder="Kode 10-Digit" required
        class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40" />
    </div>

    <div class="grid grid-cols-2 gap-4">
      <input bind:value={rw} type="text" placeholder="RW" required
        class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40" />
      <input bind:value={rt} type="text" placeholder="RT" required
        class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40" />
    </div>
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

  <button type="submit" disabled={isSubmitting}
    class="w-full rounded-full bg-brand text-white px-6 py-4 text-[16px] font-semibold hover:bg-brand/90 transition-colors disabled:opacity-60">
    {isSubmitting ? "Mendaftarkan RT..." : "Daftarkan RT & Buat Akun"}
  </button>
</form>