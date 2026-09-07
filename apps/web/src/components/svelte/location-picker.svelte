<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { MapPin, MagnifyingGlass, CaretDown, CircleNotch } from "phosphor-svelte";

  interface Prefill {
    subdistrictCode?: string;
  }

  let {
    address = $bindable(""),
    latitude = $bindable<number | null>(null),
    longitude = $bindable<number | null>(null),
    autoLocate = true,
    prefill = undefined as Prefill | undefined,
  } = $props();

  // --- Map States ---
  let mapContainer: HTMLDivElement;
  let map: any = null;
  let marker: any = null;
  let L: any = null;
  let isGeocoding = $state(false);
  let isLocating = $state(false);
  let locationError = $state("");
  let geocodeTimeout: ReturnType<typeof setTimeout>;

  let suggestions = $state<any[]>([]);
  let showSuggestions = $state(false);

  const DEFAULT_CENTER: [number, number] = [-7.9666, 112.6326];

  // --- Wilayah API States ---
  const API_WILAYAH = "https://www.emsifa.com/api-wilayah-indonesia/api";

  let provinces = $state<any[]>([]);
  let regencies = $state<any[]>([]);
  let districts = $state<any[]>([]);
  let villages = $state<any[]>([]);

  let selectedProv = $state("");
  let selectedReg = $state("");
  let selectedDist = $state("");
  let selectedVill = $state("");

  onMount(async () => {
    try {
      const res = await fetch(`${API_WILAYAH}/provinces.json`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      provinces = await res.json();
    } catch (e) {
      console.error("Gagal memuat data provinsi", e);
      alert("Gagal memuat daftar provinsi. Cek console atau matikan sementara shield/adblocker browser Anda.");
    }

    L = (await import("leaflet")).default;
    await import("leaflet/dist/leaflet.css");

    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    const startCenter: [number, number] = latitude && longitude ? [latitude, longitude] : DEFAULT_CENTER;
    map = L.map(mapContainer).setView(startCenter, latitude ? 17 : 14);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    marker = L.marker(startCenter, { draggable: true }).addTo(map);

    marker.on("dragend", async () => {
      const pos = marker.getLatLng();
      latitude = pos.lat;
      longitude = pos.lng;
      await reverseGeocode(pos.lat, pos.lng);
    });

    map.on("click", async (e: any) => {
      marker.setLatLng(e.latlng);
      latitude = e.latlng.lat;
      longitude = e.latlng.lng;
      await reverseGeocode(e.latlng.lat, e.latlng.lng);
    });

    // Priority: cadre's registered RT code > GPS auto-locate > nothing
    if (prefill?.subdistrictCode) {
      await applyPrefillCode(prefill.subdistrictCode);
    } else if (autoLocate && !latitude && !longitude) {
      requestCurrentLocation();
    }
  });

  onDestroy(() => {
    if (map) map.remove();
  });

  /**
   * Kemendagri 10-digit wilayah code format: PP.KK.KKK.KKK
   *   - 2 digits: provinsi
   *   - 2 digits: kota/kabupaten
   *   - 3 digits: kecamatan
   *   - 3 digits: kelurahan/desa
   * The emsifa wilayah API keys districts/villages by the FULL cumulative
   * code up to that segment (not just that segment's own digits), so we
   * slice cumulatively rather than splitting into four separate parts.
   */
  async function applyPrefillCode(code: string) {
    if (!code || code.length < 10) return;

    const provId = code.slice(0, 2);
    const regId = code.slice(0, 4);
    const distId = code.slice(0, 7);
    const villId = code;

    isGeocoding = true;
    try {
      selectedProv = provId;
      await fetchRegencies();

      selectedReg = regId;
      await fetchDistricts();

      selectedDist = distId;
      await fetchVillages();

      selectedVill = villId;
      await handleVillageSelect();
    } catch (e) {
      console.error("Gagal mengisi wilayah otomatis dari data RT", e);
    } finally {
      isGeocoding = false;
    }
  }

  function requestCurrentLocation() {
    if (!navigator.geolocation) {
      locationError = "Perangkat tidak mendukung GPS.";
      return;
    }

    isLocating = true;
    locationError = "";

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;

        if (map && marker) {
          map.setView([latitude, longitude], 17);
          marker.setLatLng([latitude, longitude]);
        }

        await reverseGeocode(latitude, longitude);
        isLocating = false;
      },
      () => {
        locationError = "Gagal mengambil lokasi. Pilih wilayah manual atau geser pin di peta.";
        isLocating = false;
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  // --- Cascading Dropdown Handlers ---
  async function fetchRegencies() {
    regencies = []; districts = []; villages = [];
    selectedReg = ""; selectedDist = ""; selectedVill = "";
    if (!selectedProv) return;
    const res = await fetch(`${API_WILAYAH}/regencies/${selectedProv}.json`);
    regencies = await res.json();
  }

  async function fetchDistricts() {
    districts = []; villages = [];
    selectedDist = ""; selectedVill = "";
    if (!selectedReg) return;
    const res = await fetch(`${API_WILAYAH}/districts/${selectedReg}.json`);
    districts = await res.json();
  }

  async function fetchVillages() {
    villages = [];
    selectedVill = "";
    if (!selectedDist) return;
    const res = await fetch(`${API_WILAYAH}/villages/${selectedDist}.json`);
    villages = await res.json();
  }

  async function handleVillageSelect() {
    if (!selectedVill) return;

    const provName = provinces.find(p => p.id === selectedProv)?.name;
    const regName = regencies.find(r => r.id === selectedReg)?.name;
    const distName = districts.find(d => d.id === selectedDist)?.name;
    const villName = villages.find(v => v.id === selectedVill)?.name;

    if (provName && regName && distName && villName) {
      const areaString = `${villName}, ${distName}, ${regName}, ${provName}`;
      // reset instead of appending, otherwise picking a region twice
      // mangles the query string and geocoding silently fails
      address = areaString;

      isGeocoding = true;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(areaString)}&limit=1`);
        const data = await res.json();
        if (data?.[0]) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          latitude = lat; longitude = lng;
          if (map && marker) {
            map.setView([lat, lng], 15);
            marker.setLatLng([lat, lng]);
          }
        }
      } catch {} finally {
        isGeocoding = false;
      }
    }
  }

  // --- Map Handlers ---
  async function reverseGeocode(lat: number, lng: number) {
    isGeocoding = true;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`);
      const data = await res.json();
      if (data?.display_name) {
        address = data.display_name;
        showSuggestions = false;
      }
    } catch {} finally {
      isGeocoding = false;
    }
  }

  function handleAddressInput() {
    showSuggestions = true;
    clearTimeout(geocodeTimeout);

    geocodeTimeout = setTimeout(async () => {
      if (!address || address.trim().length < 4) {
        suggestions = [];
        return;
      }
      isGeocoding = true;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=5&countrycodes=id`);
        suggestions = await res.json();
      } catch {} finally {
        isGeocoding = false;
      }
    }, 1000);
  }

  function selectSuggestion(place: any) {
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);

    latitude = lat;
    longitude = lng;
    address = place.display_name;

    suggestions = [];
    showSuggestions = false;

    if (map && marker) {
      map.setView([lat, lng], 17);
      marker.setLatLng([lat, lng]);
    }
  }
</script>

<div class="flex flex-col gap-4">
  {#if isLocating}
    <div class="flex items-center gap-2 rounded-2xl bg-brand/10 px-5 py-3 text-brand">
      <CircleNotch weight="bold" class="size-4.5 animate-spin" />
      <span class="text-[14px] font-medium">Mengambil lokasi Anda saat ini...</span>
    </div>
  {/if}

  {#if locationError}
    <p class="text-[13px] text-red-500">{locationError}</p>
  {/if}

  <!-- Cascading Wilayah Dropdowns -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
    <div class="relative">
      <select bind:value={selectedProv} onchange={fetchRegencies} class="w-full appearance-none rounded-2xl bg-light-darker pl-4 pr-10 py-3 text-[15px] outline-none focus:ring-2 focus:ring-brand/40 max-h-48">
        <option value="">Pilih Provinsi</option>
        {#each provinces as prov}
          <option value={prov.id}>{prov.name}</option>
        {/each}
      </select>
      <CaretDown weight="bold" class="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-dark/40 pointer-events-none" />
    </div>

    <div class="relative">
      <select bind:value={selectedReg} onchange={fetchDistricts} disabled={!selectedProv} class="w-full appearance-none rounded-2xl bg-light-darker pl-4 pr-10 py-3 text-[15px] outline-none focus:ring-2 focus:ring-brand/40 disabled:opacity-50 max-h-48">
        <option value="">Pilih Kota/Kabupaten</option>
        {#each regencies as reg}
          <option value={reg.id}>{reg.name}</option>
        {/each}
      </select>
      <CaretDown weight="bold" class="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-dark/40 pointer-events-none" />
    </div>

    <div class="relative">
      <select bind:value={selectedDist} onchange={fetchVillages} disabled={!selectedReg} class="w-full appearance-none rounded-2xl bg-light-darker pl-4 pr-10 py-3 text-[15px] outline-none focus:ring-2 focus:ring-brand/40 disabled:opacity-50 max-h-48">
        <option value="">Pilih Kecamatan</option>
        {#each districts as dist}
          <option value={dist.id}>{dist.name}</option>
        {/each}
      </select>
      <CaretDown weight="bold" class="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-dark/40 pointer-events-none" />
    </div>

    <div class="relative">
      <select bind:value={selectedVill} onchange={handleVillageSelect} disabled={!selectedDist} class="w-full appearance-none rounded-2xl bg-light-darker pl-4 pr-10 py-3 text-[15px] outline-none focus:ring-2 focus:ring-brand/40 disabled:opacity-50 max-h-48">
        <option value="">Pilih Kelurahan/Desa</option>
        {#each villages as vill}
          <option value={vill.id}>{vill.name}</option>
        {/each}
      </select>
      <CaretDown weight="bold" class="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-dark/40 pointer-events-none" />
    </div>
  </div>

  <!-- Detail Address & Autocomplete -->
  <div class="relative z-[9999]">
    <textarea
      bind:value={address}
      oninput={handleAddressInput}
      placeholder="Alamat akan terisi otomatis, atau ketik detail (Nama jalan, RT/RW, No Rumah)..."
      rows="2"
      class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40 resize-y relative z-10"
    ></textarea>

    {#if isGeocoding}
      <span class="absolute right-4 top-3.5 text-[13px] text-dark/40 animate-pulse z-20">Mencari...</span>
    {/if}

    {#if showSuggestions && suggestions.length > 0}
      <ul class="absolute top-full mt-1 left-0 w-full bg-white border border-dark/10 rounded-2xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto z-[10000]">
        {#each suggestions as place}
          <li>
            <button
              type="button"
              onclick={() => selectSuggestion(place)}
              class="w-full text-left px-5 py-3 hover:bg-light-darker border-b border-dark/5 transition flex items-start gap-3"
            >
              <MagnifyingGlass class="size-4.5 text-dark/40 mt-0.5 shrink-0" />
              <span class="text-[14px] text-dark leading-snug">{place.display_name}</span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <!-- Leaflet Map -->
  <div bind:this={mapContainer} class="w-full h-64 rounded-3xl overflow-hidden bg-light-darker relative z-0 isolate border border-dark/5"></div>

  <button
    type="button"
    onclick={requestCurrentLocation}
    disabled={isLocating}
    class="flex items-center justify-center gap-2 rounded-full bg-brand/10 text-brand px-5 py-3 text-[15px] font-medium hover:bg-brand/15 transition-colors disabled:opacity-60 self-start"
  >
    <MapPin weight="fill" class="size-4.5" />
    Gunakan Lokasi Saya Sekarang
  </button>

  <!-- Coordinates Note -->
  <div class="flex items-center gap-2 text-dark/50">
    <MapPin weight="fill" class="size-4.5 shrink-0" />
    <p class="text-[13px]">
      {latitude && longitude
        ? `Koordinat: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
        : "Pilih kelurahan, geser pin, atau gunakan lokasi Anda untuk menandai posisi"}
    </p>
  </div>
</div>