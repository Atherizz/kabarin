<script lang="ts">
  import { apiPost } from "../../lib/api-post";
  import { MapPin, CircleNotch } from "phosphor-svelte";

  let name = $state("");
  let phone = $state("");
  let email = $state("");
  let address = $state("");
  let rt = $state("");
  let rw = $state("");
  let latitude = $state<number | null>(null);
  let longitude = $state<number | null>(null);
  let maxCapacity = $state(5);

  let isLocating = $state(false);
  let isSubmitting = $state(false);
  let errorMessage = $state("");
  let successData = $state<{ email: string; temporaryPassword: string; name: string } | null>(null);

  function captureLocation() {
    if (!navigator.geolocation) {
      errorMessage = "Perangkat tidak mendukung GPS.";
      return;
    }
    isLocating = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
        isLocating = false;
      },
      () => {
        errorMessage = "Gagal mengambil lokasi. Pastikan izin GPS diaktifkan.";
        isLocating = false;
      }
    );
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    errorMessage = "";

    if (!name || !phone || !email || !address || !rt || !rw) {
      errorMessage = "Lengkapi semua data yang wajib diisi.";
      return;
    }

    isSubmitting = true;

    const payload = {
      name,
      phone,
      email,
      address,
      rt,
      rw,
      latitude: latitude ?? undefined,
      longitude: longitude ?? undefined,
      maxCapacity,
    };

    const result = await apiPost<{ email: string; temporaryPassword: string; name: string }>(
      "/api/volunteers",
      payload
    );

    isSubmitting = false;

    if (!result.ok) {
      errorMessage = result.error ?? "Gagal mendaftarkan relawan.";
      return;
    }

    successData = result.data ?? null;
  }
</script>

{#if successData}
  <div class="rounded-[28px] bg-green-500/10 p-7 flex flex-col gap-4">
    <p class="text-[18px] font-semibold text-dark">
      Relawan {successData.name} berhasil didaftarkan! 🎉
    </p>
    <p class="text-[15px] text-dark/60">
      Kredensial berikut telah dikirim otomatis ke WhatsApp relawan. Simpan juga di sini sebagai cadangan:
    </p>
    <div class="rounded-2xl bg-light px-5 py-4 flex flex-col gap-1.5">
      <p class="text-[14px] text-dark/50">Email</p>
      <p class="text-[16px] font-medium text-dark">{successData.email}</p>
      <p class="text-[14px] text-dark/50 mt-2">Password Sementara</p>
      <p class="text-[16px] font-medium text-dark">{successData.temporaryPassword}</p>
    </div>
    <a
      href="/volunteers"
      class="self-start rounded-full bg-brand text-white px-5 py-3 text-[15px] font-medium hover:bg-brand/90 transition-colors"
    >
      Kembali ke Direktori
    </a>
  </div>
{:else}
  <form onsubmit={handleSubmit} class="flex flex-col gap-5">
    {#if errorMessage}
      <p class="rounded-2xl bg-red-500/10 text-red-600 px-5 py-3.5 text-[15px]">{errorMessage}</p>
    {/if}

    <input bind:value={name} type="text" placeholder="Nama lengkap" required
      class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40" />

    <input bind:value={phone} type="tel" placeholder="Nomor WhatsApp" required
      class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40" />

    <input bind:value={email} type="email" placeholder="Email" required
      class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40" />

    <textarea bind:value={address} placeholder="Alamat lengkap" required rows="2"
      class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40 resize-y"></textarea>

    <div class="grid grid-cols-2 gap-4">
      <input bind:value={rt} type="text" placeholder="RT" required
        class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40" />
      <input bind:value={rw} type="text" placeholder="RW" required
        class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40" />
    </div>

    <div>
      <label class="text-[14px] text-dark/50 mb-1.5 block">Kapasitas Maksimal Binaan</label>
      <input bind:value={maxCapacity} type="number" min="1" max="20"
        class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40" />
    </div>

    <button type="button" onclick={captureLocation} disabled={isLocating}
      class="flex items-center justify-center gap-2 rounded-full bg-brand/10 text-brand px-5 py-3 text-[15px] font-medium hover:bg-brand/15 transition-colors disabled:opacity-60">
      {#if isLocating}
        <CircleNotch weight="bold" class="size-5 animate-spin" />
        Mengambil lokasi...
      {:else}
        <MapPin weight="fill" class="size-5" />
        {latitude ? "Lokasi tersimpan ✓" : "Ambil Titik GPS Rumah"}
      {/if}
    </button>

    <button type="submit" disabled={isSubmitting}
      class="w-full rounded-full bg-brand text-white px-6 py-4 text-[16px] font-semibold hover:bg-brand/90 transition-colors disabled:opacity-60">
      {isSubmitting ? "Mendaftarkan..." : "Daftarkan Relawan"}
    </button>
  </form>
{/if}