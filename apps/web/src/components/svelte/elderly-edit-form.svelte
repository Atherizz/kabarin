<script lang="ts">
  import type { Elderly } from "@kabarin/types";

  let { initialData }: { initialData: Elderly } = $props();

  let formData = $state({
    name: initialData.name,
    age: initialData.age,
    gender: initialData.gender,
    phone: initialData.phone || "",
    address: initialData.address,
    rt: initialData.rt,
    rw: initialData.rw,
    mobilityStatus: initialData.mobilityStatus,
    monitoringMode: initialData.monitoringMode,
    preferredCheckinTime: initialData.preferredCheckinTime,
    medicalHistory: initialData.medicalHistory || "",
  });

  let isSubmitting = $state(false);
  let errorMessage = $state("");

  async function handleSubmit(e: Event) {
    e.preventDefault();
    isSubmitting = true;
    errorMessage = "";

    try {
      // Using native fetch to allow PATCH method since apiPost hardcodes POST
      const res = await fetch(`/api/elderly/${initialData.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          age: Number(formData.age)
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        errorMessage = json.error || "Gagal memperbarui data lansia.";
        isSubmitting = false;
        return;
      }

      window.location.href = `/elderly/${initialData.id}`;
    } catch (err) {
      errorMessage = "Koneksi ke server gagal.";
      isSubmitting = false;
    }
  }
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-6">
  {#if errorMessage}
    <div class="rounded-2xl bg-red-500/10 px-5 py-3.5 text-[14px] text-red-600">
      {errorMessage}
    </div>
  {/if}

  <div class="rounded-[28px] bg-light-darker p-6 flex flex-col gap-5">
    <h2 class="text-[18px] font-semibold text-dark border-b border-dark/10 pb-3">Informasi Pribadi</h2>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="flex flex-col gap-1.5">
        <label class="text-[13px] font-medium text-dark/60">Nama Lengkap</label>
        <input type="text" bind:value={formData.name} required class="rounded-xl border border-dark/10 bg-white px-4 py-2.5 text-[15px] text-dark outline-none focus:border-brand transition-colors" />
      </div>
      
      <div class="flex flex-col gap-1.5">
        <label class="text-[13px] font-medium text-dark/60">Nomor WhatsApp (Opsional)</label>
        <input type="tel" bind:value={formData.phone} class="rounded-xl border border-dark/10 bg-white px-4 py-2.5 text-[15px] text-dark outline-none focus:border-brand transition-colors" />
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="text-[13px] font-medium text-dark/60">Usia</label>
        <input type="number" bind:value={formData.age} required min="50" class="rounded-xl border border-dark/10 bg-white px-4 py-2.5 text-[15px] text-dark outline-none focus:border-brand transition-colors" />
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="text-[13px] font-medium text-dark/60">Jenis Kelamin</label>
        <select bind:value={formData.gender} class="rounded-xl border border-dark/10 bg-white px-4 py-2.5 text-[15px] text-dark outline-none focus:border-brand transition-colors">
          <option value="male">Laki-laki</option>
          <option value="female">Perempuan</option>
        </select>
      </div>
    </div>
  </div>

  <div class="rounded-[28px] bg-light-darker p-6 flex flex-col gap-5">
    <h2 class="text-[18px] font-semibold text-dark border-b border-dark/10 pb-3">Domisili & Kondisi</h2>
    
    <div class="flex flex-col gap-1.5">
      <label class="text-[13px] font-medium text-dark/60">Alamat Lengkap</label>
      <input type="text" bind:value={formData.address} required class="rounded-xl border border-dark/10 bg-white px-4 py-2.5 text-[15px] text-dark outline-none focus:border-brand transition-colors" />
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div class="flex flex-col gap-1.5">
        <label class="text-[13px] font-medium text-dark/60">RT</label>
        <input type="text" bind:value={formData.rt} required class="rounded-xl border border-dark/10 bg-white px-4 py-2.5 text-[15px] text-dark outline-none focus:border-brand transition-colors" />
      </div>
      <div class="flex flex-col gap-1.5">
        <label class="text-[13px] font-medium text-dark/60">RW</label>
        <input type="text" bind:value={formData.rw} required class="rounded-xl border border-dark/10 bg-white px-4 py-2.5 text-[15px] text-dark outline-none focus:border-brand transition-colors" />
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
      <div class="flex flex-col gap-1.5">
        <label class="text-[13px] font-medium text-dark/60">Status Mobilitas</label>
        <select bind:value={formData.mobilityStatus} class="rounded-xl border border-dark/10 bg-white px-4 py-2.5 text-[15px] text-dark outline-none focus:border-brand transition-colors">
          <option value="independent">Mandiri</option>
          <option value="needs_assistance">Butuh Bantuan</option>
          <option value="homebound">Homebound (Tidak bisa keluar rumah)</option>
        </select>
      </div>
      <div class="flex flex-col gap-1.5">
        <label class="text-[13px] font-medium text-dark/60">Metode Pemantauan</label>
        <select bind:value={formData.monitoringMode} class="rounded-xl border border-dark/10 bg-white px-4 py-2.5 text-[15px] text-dark outline-none focus:border-brand transition-colors">
          <option value="active">Aktif (Bot WA Lansia)</option>
          <option value="passive">Pasif (Kunjungan Relawan/Keluarga)</option>
        </select>
      </div>
    </div>

    <div class="flex flex-col gap-1.5 pt-2">
      <label class="text-[13px] font-medium text-dark/60">Jam Sapaan Harian</label>
      <input type="time" bind:value={formData.preferredCheckinTime} required class="rounded-xl border border-dark/10 bg-white px-4 py-2.5 text-[15px] text-dark outline-none focus:border-brand transition-colors" />
    </div>

    <div class="flex flex-col gap-1.5 pt-2">
      <label class="text-[13px] font-medium text-dark/60">Riwayat Medis & Komorbid</label>
      <textarea bind:value={formData.medicalHistory} rows="3" class="rounded-xl border border-dark/10 bg-white px-4 py-2.5 text-[15px] text-dark outline-none focus:border-brand transition-colors"></textarea>
      <p class="text-[12px] text-dark/40">Mengubah field ini akan memperbarui panduan observasi relawan secara otomatis.</p>
    </div>
  </div>

  <div class="flex justify-end gap-3 mt-4">
    <a href={`/elderly/${initialData.id}`} class="rounded-full px-6 py-3 text-[15px] font-medium text-dark/70 hover:bg-dark/5 transition-colors">
      Batal
    </a>
    <button type="submit" disabled={isSubmitting} class="rounded-full bg-brand px-8 py-3 text-[15px] font-semibold text-white hover:bg-brand/90 transition-colors disabled:opacity-50">
      {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
    </button>
  </div>
</form>