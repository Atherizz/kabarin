<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { MapPin } from "phosphor-svelte";

  let {
    address = $bindable(""),
    latitude = $bindable<number | null>(null),
    longitude = $bindable<number | null>(null),
  } = $props();

  let mapContainer: HTMLDivElement;
  let map: any = null;
  let marker: any = null;
  let L: any = null;
  let isGeocoding = $state(false);
  let geocodeTimeout: ReturnType<typeof setTimeout>;

  const DEFAULT_CENTER: [number, number] = [-7.9666, 112.6326]; // Malang

  onMount(async () => {
    L = (await import("leaflet")).default;
    await import("leaflet/dist/leaflet.css");

    // Fix default marker icon paths
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    const startCenter: [number, number] =
      latitude && longitude ? [latitude, longitude] : DEFAULT_CENTER;

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
  });

  onDestroy(() => {
    if (map) map.remove();
  });

  async function reverseGeocode(lat: number, lng: number) {
    isGeocoding = true;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
      );
      const data = await res.json();
      if (data?.display_name) {
        address = data.display_name;
      }
    } catch {
      // Silent fail, user can still type address manually
    } finally {
      isGeocoding = false;
    }
  }

  function handleAddressInput() {
    clearTimeout(geocodeTimeout);
    geocodeTimeout = setTimeout(async () => {
      if (!address || address.trim().length < 5) return;
      isGeocoding = true;
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
        );
        const results = await res.json();
        if (results?.[0]) {
          const lat = parseFloat(results[0].lat);
          const lng = parseFloat(results[0].lon);
          latitude = lat;
          longitude = lng;
          if (map && marker) {
            map.setView([lat, lng], 17);
            marker.setLatLng([lat, lng]);
          }
        }
      } catch {
        // Silent fail
      } finally {
        isGeocoding = false;
      }
    }, 1000);
  }
</script>

<div class="flex flex-col gap-3">
  <div class="relative">
    <textarea
      bind:value={address}
      oninput={handleAddressInput}
      placeholder="Ketik alamat lengkap, atau geser pin di peta..."
      rows="2"
      class="w-full rounded-3xl bg-light-darker px-5 py-3.5 text-[16px] outline-none focus:ring-2 focus:ring-brand/40 resize-y"
    ></textarea>
    {#if isGeocoding}
      <span class="absolute right-4 top-3.5 text-[13px] text-dark/40">Mencari...</span>
    {/if}
  </div>

  <div bind:this={mapContainer} class="w-full h-64 rounded-3xl overflow-hidden bg-light-darker"></div>

  <div class="flex items-center gap-2 text-dark/50">
    <MapPin weight="fill" class="size-4.5 shrink-0" />
    <p class="text-[13px]">
      {latitude && longitude
        ? `Koordinat: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
        : "Geser pin atau ketik alamat untuk menandai lokasi"}
    </p>
  </div>
</div>
