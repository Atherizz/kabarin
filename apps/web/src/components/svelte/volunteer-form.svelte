<script lang="ts">
  import { apiPost } from "../../lib/api-post";
  import LocationPicker from "./location-picker.svelte";

  let name = $state("");
  let email = $state("");
  let phone = $state("");
  let address = $state("");
  let rt = $state("");
  let rw = $state("");
  let latitude = $state<number | null>(null);
  let longitude = $state<number | null>(null);
  let maxCapacity = $state<number>(5);

  let isSubmitting = $state(false);
  let errorMessage = $state("");

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    errorMessage = "";

    if (!name || !email || !phone || !address || !rt || !rw) {
      errorMessage = "Lengkapi data identitas dan kontak relawan terlebih dahulu.";
      return;
    }

    isSubmitting = true;

    const payload = {
      name,
      email,
      phone,
      address,
      rt,
      rw,
      latitude: latitude ?? undefined,
      longitude: longitude ?? undefined,
      maxCapacity,
    };
  
    const result = await apiPost<{ id: string }>("/api/volunteers", payload);

    isSubmitting = false;

    if (!result.ok) {
      errorMessage = result.error ?? "Gagal mendaftarkan relawan.";
      return;
    }

    window.location.href = "/volunteers";
  }
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-10">
  {#if errorMessage}
    <p class="rounded-2xl bg-red-500/10 text-red-600 px-5 py-3.5 text-[15px]">{errorMessage}</p>
  {/if}

  <section class="flex flex-col gap-4">
    <h2 class="text-[20px] font-semibold text-dark">Informasi Akun & Kontak</h2>

    <input
      bind:value={name}
      type="text"
      placeholder="Nama lengkap"
      required
      class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40"
    />

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <input
        bind:value={email}
        type="email"
        placeholder="Alamat Email (untuk login)"
        required
        class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40"
      />
      <input
        bind:value={phone}
        type="tel"
        placeholder="Nomor WhatsApp"
        required
        class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40"
      />
    </div>

    <p class="text-[13px] text-dark/50 ml-2">
      *Sistem akan otomatis membuatkan akun web untuk relawan. Password sementara (Kabarin2026!) akan dikirim melalui WhatsApp.
    </p>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-[20px] font-semibold text-dark">Domisili & Kapasitas</h2>

    <LocationPicker bind:address bind:latitude bind:longitude />

    <div class="grid grid-cols-2 gap-4">
      <input
        bind:value={rt}
        type="text"
        placeholder="RT"
        required
        class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40"
      />
      <input
        bind:value={rw}
        type="text"
        placeholder="RW"
        required
        class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40"
      />
    </div>

    <div>
      <label class="text-[14px] text-dark/50 mb-1.5 ml-2 block">Batas Maksimal Binaan Lansia</label>
      <input
        bind:value={maxCapacity}
        type="number"
        min="1"
        max="20"
        required
        class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40"
      />
    </div>
  </section>

  <button
    type="submit"
    disabled={isSubmitting}
    class="w-full rounded-full bg-brand text-white px-6 py-4 text-[16px] font-semibold hover:bg-brand/90 transition-colors disabled:opacity-60"
  >
    {isSubmitting ? "Mendaftarkan Akun..." : "Daftarkan Relawan"}
  </button>
</form>