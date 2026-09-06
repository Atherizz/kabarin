<script lang="ts">
  import { apiPost } from '../../lib/api-post';
  import { Phone, Users, Activity, Plus } from "phosphor-svelte";
  
  let { elderly = [] } = $props();
  
  let sosLoadingId = $state<string | null>(null);
  let inviteModalOpen = $state(false);
  let selectedElderlyId = $state<string | null>(null);
  
  let inviteName = $state('');
  let invitePhone = $state('');
  let inviteRelation = $state('Anak');
  let isInviting = $state(false);

  const statusConfig = {
    green: { label: 'Aman Terverifikasi', dot: 'bg-emerald-400', border: 'border-emerald-500/20' },
    yellow: { label: 'Butuh Perhatian', dot: 'bg-amber-400', border: 'border-amber-500/20' },
    red: { label: 'Eskalasi Darurat', dot: 'bg-rose-500', border: 'border-rose-500/30' },
    grey: { label: 'Belum Terjadwal', dot: 'bg-[#52525b]', border: 'border-white/10' }
  };

  async function handleSos(id: string) {
    sosLoadingId = id;
    const res = await apiPost('/api/family/trigger-sos', { elderlyId: id });
    sosLoadingId = null;
    if (res.success) {
      alert('Permintaan cek fisik telah dikirim ke relawan terdekat.');
    }
  }

  async function handleInvite(e: Event) {
    e.preventDefault();
    if (!selectedElderlyId) return;
    
    isInviting = true;
    const res = await apiPost('/api/family/create', { 
      elderlyId: selectedElderlyId,
      name: inviteName,
      phone: invitePhone,
      relationship: inviteRelation
    });
    isInviting = false;
    
    if (res.success) {
      alert('Tautan akses berhasil dikirim via WhatsApp ke saudara Anda.');
      inviteModalOpen = false;
      inviteName = ''; invitePhone = '';
    }
  }

  function openInviteModal(id: string) {
    selectedElderlyId = id;
    inviteModalOpen = true;
  }
</script>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {#each elderly as person}
    {@const state = statusConfig[person.currentStatus] || statusConfig.grey}
    
    <article class="flex flex-col p-8 rounded-[32px] bg-white/[0.03] backdrop-blur-2xl border {state.border} shadow-2xl relative overflow-hidden group">
      
      <!-- Header -->
      <div class="flex items-start justify-between mb-8 z-10">
        <div>
          <h2 class="text-2xl font-medium tracking-tight text-white">{person.name}</h2>
          <p class="text-[#a1a1aa] mt-1 text-sm">{person.communityName}</p>
        </div>
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-white/5">
          <span class="w-2 h-2 rounded-full {state.dot} shadow-[0_0_8px_currentColor]"></span>
          <span class="text-xs font-medium text-[#d4d4d8]">{state.label}</span>
        </div>
      </div>

      <!-- Bento Stats -->
      <div class="grid grid-cols-2 gap-4 mb-8 z-10">
        <div class="p-4 rounded-2xl bg-black/20 border border-white/5 flex flex-col gap-1">
          <div class="flex items-center gap-2 text-[#a1a1aa] mb-1">
            <Activity weight="fill" class="size-4" />
            <span class="text-xs font-medium">Obat Aktif</span>
          </div>
          <span class="text-lg font-medium text-white">{person.activeMedicationsCount} Resep</span>
        </div>
        <div class="p-4 rounded-2xl bg-black/20 border border-white/5 flex flex-col gap-1">
          <div class="flex items-center gap-2 text-[#a1a1aa] mb-1">
            <Phone weight="fill" class="size-4" />
            <span class="text-xs font-medium">Jam Sapaan</span>
          </div>
          <span class="text-lg font-medium text-white">{person.preferredCheckinTime} WIB</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="mt-auto flex flex-col sm:flex-row gap-3 z-10">
        <a 
          href={`/status/${person.accessToken}`}
          class="flex-1 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/5 text-[#f4f3ee] text-sm font-medium transition text-center"
        >
          Lihat Riwayat
        </a>
        <button 
          onclick={() => openInviteModal(person.id)}
          class="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition text-[#f4f3ee] text-sm font-medium"
        >
          <Users weight="fill" class="size-4" />
          Undang Saudara
        </button>
      </div>
      
      <!-- SOS Button -->
      <button 
        onclick={() => handleSos(person.id)}
        disabled={sosLoadingId === person.id}
        class="mt-3 w-full py-3.5 rounded-xl bg-[#f4f3ee] hover:bg-white text-[#0a0a0a] text-sm font-semibold transition disabled:opacity-50"
      >
        {sosLoadingId === person.id ? 'Mengirim Panggilan Darurat...' : 'Minta Relawan Cek Sekarang'}
      </button>
    </article>
  {/each}
</div>

<!-- Sibling Invite Modal -->
{#if inviteModalOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
    <div class="w-full max-w-md p-8 rounded-[32px] bg-[#121212] border border-white/10 shadow-2xl relative">
      <h3 class="text-xl font-medium text-white mb-2">Undang Anggota Keluarga</h3>
      <p class="text-[#a1a1aa] text-sm mb-6">Kirimkan akses pantau lansia ini ke WhatsApp saudara Anda tanpa perlu membuat akun.</p>
      
      <form onsubmit={handleInvite} class="space-y-4">
        <div>
          <label class="block text-xs font-medium text-[#a1a1aa] mb-1">Nama Lengkap</label>
          <input 
            type="text" 
            bind:value={inviteName} 
            required 
            class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition"
            placeholder="Contoh: Budi Santoso"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-[#a1a1aa] mb-1">Nomor WhatsApp</label>
          <input 
            type="tel" 
            bind:value={invitePhone} 
            required 
            class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition"
            placeholder="0812..."
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-[#a1a1aa] mb-1">Hubungan</label>
          <select 
            bind:value={inviteRelation} 
            class="w-full px-4 py-3 rounded-xl bg-[#1a1a1a] border border-white/10 text-white focus:outline-none focus:border-white/30 transition appearance-none"
          >
            <option>Anak</option>
            <option>Menantu</option>
            <option>Cucu</option>
            <option>Kerabat Lainnya</option>
          </select>
        </div>
        
        <div class="flex gap-3 mt-8">
          <button 
            type="button" 
            onclick={() => inviteModalOpen = false}
            class="flex-1 py-3 rounded-xl bg-transparent border border-white/10 text-white hover:bg-white/5 transition text-sm font-medium"
          >
            Batal
          </button>
          <button 
            type="submit" 
            disabled={isInviting}
            class="flex-1 py-3 rounded-xl bg-[#f4f3ee] text-[#0a0a0a] hover:bg-white transition text-sm font-semibold disabled:opacity-50"
          >
            {isInviting ? 'Mengirim...' : 'Kirim Undangan'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}