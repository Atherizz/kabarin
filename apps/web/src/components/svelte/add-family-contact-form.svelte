<script lang="ts">
  import { apiPost } from "../../lib/api-post";
  import { Plus, X } from "phosphor-svelte";

  interface Props {
    elderlyId: string;
  }

  let { elderlyId }: Props = $props();

  let isOpen = $state(false);
  let name = $state("");
  let phone = $state("");
  let relationship = $state("");
  let notifyViaWhatsapp = $state(true);

  let isSubmitting = $state(false);
  let errorMessage = $state("");

  function resetForm() {
    name = "";
    phone = "";
    relationship = "";
    notifyViaWhatsapp = true;
    errorMessage = "";
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    errorMessage = "";

    if (!name || !phone || !relationship) {
      errorMessage = "Lengkapi nama, nomor WhatsApp, dan hubungan keluarga.";
      return;
    }

    isSubmitting = true;

    // ASSUMPTION: mounted as POST /api/elderly/:id/family, mirroring the
    // GET /api/elderly/:id/medications nesting pattern. Confirm against the
    // router if this 404s.
    const result = await apiPost<{ id: string }>(`/api/elderly/${elderlyId}/family`, {
      name,
      phone,
      relationship,
      isPrimaryContact: false,
      notifyViaWhatsapp,
    });

    isSubmitting = false;

    if (!result.ok) {
      errorMessage = result.error ?? "Gagal menambahkan kontak keluarga.";
      return;
    }

    resetForm();
    isOpen = false;
    // Reload so the new contact shows up in the server-rendered list above.
    window.location.reload();
  }
</script>

{#if !isOpen}
  <button
    type="button"
    onclick={() => (isOpen = true)}
    class="flex items-center justify-center gap-2 rounded-full bg-light-darker px-5 py-3 text-[15px] font-medium text-dark/60 hover:bg-light-darker/70 transition-colors"
  >
    <Plus weight="bold" class="size-5" />
    Tambah Kontak Saudara
  </button>
{:else}
  <form onsubmit={handleSubmit} class="flex flex-col gap-3 rounded-3xl bg-light-darker p-5">
    <div class="flex items-center justify-between">
      <p class="text-[15px] font-semibold text-dark">Kontak Keluarga Baru</p>
      <button
        type="button"
        onclick={() => {
          isOpen = false;
          resetForm();
        }}
        class="text-dark/40 hover:text-dark/60"
      >
        <X weight="bold" class="size-4.5" />
      </button>
    </div>

    {#if errorMessage}
      <p class="rounded-xl bg-red-500/10 text-red-600 px-4 py-2.5 text-[13px]">{errorMessage}</p>
    {/if}

    <input
      bind:value={name}
      type="text"
      placeholder="Nama kakak/adik"
      class="w-full rounded-2xl bg-light px-4 py-2.5 text-[15px] outline-none"
    />
    <div class="grid grid-cols-2 gap-3">
      <input
        bind:value={phone}
        type="tel"
        placeholder="Nomor WhatsApp"
        class="w-full rounded-2xl bg-light px-4 py-2.5 text-[15px] outline-none"
      />
      <input
        bind:value={relationship}
        type="text"
        placeholder="Hubungan (Kakak, dsb)"
        class="w-full rounded-2xl bg-light px-4 py-2.5 text-[15px] outline-none"
      />
    </div>

    <label class="flex items-center gap-2 text-[13px] text-dark/60">
      <input bind:checked={notifyViaWhatsapp} type="checkbox" class="size-4" />
      Kirim notifikasi WhatsApp ke kontak ini
    </label>

    <button
      type="submit"
      disabled={isSubmitting}
      class="rounded-full bg-brand text-white px-5 py-3 text-[15px] font-semibold hover:bg-brand/90 transition-colors disabled:opacity-60"
    >
      {isSubmitting ? "Menambahkan..." : "Simpan Kontak"}
    </button>
  </form>
{/if}