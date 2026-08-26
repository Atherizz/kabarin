# System Flow & Functional Architecture
## Kabarin — Sistem Pemantauan Kesejahteraan Lansia Berbasis Komunitas RT

Dokumen ini menjelaskan **alur sistem (*System Flow*), interaksi antar-peran, dan arsitektur fungsional** platform Kabarin dari hulu ke hilir secara kronologis dan mendalam.

---

## 👥 1. Matriks Peran & Hak Akses Dashboard

Platform Kabarin dirancang dengan arsitektur **Multi-Role Web Dashboard** yang disesuaikan dengan kebutuhan masing-masing pihak:

```
                                KABARIN PLATFORM
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        ▼                              ▼                              ▼
 🏢 DASHBOARD KADER             🤝 DASHBOARD RELAWAN           👨‍👩‍👧 DASHBOARD KELUARGA
   (role: cadre)                 (role: volunteer)               (role: family)
• Kelola Wilayah RT            • Daftar Lansia Binaan          • Pantau Orang Tua / Kerabat
• Onboarding Lansia + OCR      • Riwayat & Jadwal Kunjungan    • Daftarkan Orang Tua (Inisiatif)
• Daftarkan Relawan RT         • Input Laporan Kunjungan       • Tambah Anggota Keluarga Lain
• Verifikasi Pengajuan Warga   • Ganti Password Mandiri        • Request Bantuan On-Demand
• Priority Status Cards & Briefing     • (Akses Cepat: /lapor/:token)  • (Akses Cepat: /status/:token)
```

| Peran (*Role*) | Akses Web Utama | Jalur Pembuatan Akun | Kanal Cepat / Notifikasi | Tanggung Jawab Utama |
|---|---|---|---|---|
| **Kader / Ketua RT** (`cadre`) | **Dashboard Kader** | Registrasi Mandiri (`/register`) | Web App & WhatsApp Alert | Pendaftaran RT, pendataan lansia + OCR obat, mendaftarkan relawan, verifikasi warga baru, monitoring prioritas wilayah RT, dan briefing operasional harian. |
| **Relawan RT** (`volunteer`) | **Dashboard Relawan** *(Opsional)* | **1 Pintu:** Didaftarkan oleh Kader RT di Dashboard | WhatsApp Alert & Link Cepat (`/lapor/:token`) | Memantau lansia binaan, verifikasi kunjungan fisik, submit laporan kondisi. **Tidak wajib login jika hanya pakai link WA.** |
| **Keluarga Lansia** (`family`) | **Dashboard Keluarga** *(Opsional)* | Registrasi Mandiri (`/register/family`) atau via Token WA | WhatsApp Alert & Link Cepat (`/status/:token`) | Mendaftarkan orang tua ke RT, memantau kondisi harian, melihat histori obat/kunjungan, dan meminta bantuan darurat. **Tidak wajib login jika hanya pantau via link WA.** |
| **Warga Lansia** | Tidak mengakses web | Didaftarkan Kader / Keluarga | **WhatsApp Bot** (Teks atau Voice Note) | Menerima sapaan pagi & pengingat obat, membalas bebas via teks atau rekaman suara tanpa aplikasi baru. |

---

## 🔄 2. Rincian Alur Sistem Kronologis (Flow 1 sampai Flow 9)

---

### 🟢 FLOW 1: Registrasi Ketua RT, Fondasi Multi-Tenancy, & Validasi Wilayah

> **Prinsip Multi-Tenancy Wilayah RT:**
> Setiap wilayah RT di Kabarin berdiri sebagai satu entitas **Tenant Mandiri (*community_units*)**. Seluruh data lansia, resep obat, log percakapan, dan relawan terisolasi secara ketat per wilayah (`community_unit_id`). Kader di RT 01 tidak akan pernah bisa melihat atau mengubah data milik RT 02.

```
[Ketua RT / Kader Buka Halaman /register]
                   │
                   ▼
[1. Pilih Hierarki Wilayah Kemendagri]
Provinsi ➔ Kota/Kab ➔ Kecamatan ➔ Kelurahan/Desa (Kode 10-Digit) ➔ RW ➔ RT
(Contoh: Jawa Timur ➔ Kota Malang ➔ Lowokwaru ➔ Jatimulyo [3573051007] ➔ RW 10 ➔ RT 01)
                   │
                   ▼
[2. Pengecekan Ketersediaan Wilayah (Real-Time Composite Check)]
Sistem memvalidasi kunci unik: {subdistrict_code}-RW{rw}-RT{rt}
                   │
         ┌─────────┴─────────────────────────────────────────┐
         ▼                                                   ▼
(KONDISI A: Wilayah Belum Terdaftar)            (KONDISI B: Wilayah Sudah Didaftarkan)
Status: HIJAU ✅                                 Status: KUNING / MERAH ⚠️
"RT 01 / RW 10 Jatimulyo tersedia!              "Wilayah RT 01 / RW 10 Jatimulyo sudah
 Anda akan menjadi Pengelola Pertama."           didaftarkan oleh pengelola lain sebelumnya."
         │                                                   │
         ▼                                                   ▼
[3. Input Data Akun Ketua RT / Kader]           [Opsi Tindakan:]
• Nama Lengkap (e.g. Ibu Endang Astuti)         1. Login jika Anda sudah punya akun.
• Nomor WhatsApp (e.g. 081233445566)            2. Hubungi Kader aktif jika ingin bergabung
• Email & Password (min 8 karakter)                sebagai kader pendamping tambahan.
         │                                      3. Ajukan Klaim Kepengurusan Wilayah (Dispute).
         ▼  (API: POST /api/community/register)
[4. Transaksi Atomik Database]
1. Buat Tenant Baru di tabel community_units.
2. Buat Akun Pengguna di tabel user (role: cadre, community_unit_id terikat).
3. Buat Sesi Login Otomatis (Better Auth Session Cookie).
         │
         ▼
[5. Redirect Langsung ke /dashboard]
Kader langsung masuk ke dashboard RT-nya yang siap dipakai mendata lansia.
```

---

### 🟢 FLOW 2: Pendaftaran Lansia Baru & Smart OCR Resep Medis

```
                              PENDAFTARAN LANSIA
                                       │
        ┌──────────────────────────────┴──────────────────────────────┐
        ▼                                                             ▼
 [JALUR A: TOP-DOWN OLEH KADER RT]             [JALUR B: BOTTOM-UP OLEH KELUARGA]
 (Kader input saat Posyandu/Door-to-Door)       (Anak rantau inisiatif daftarkan orang tua)
        │                                                             │
        ▼                                                             ▼
 [Form Onboarding Lansia di Web]                [1. Keluarga Bikin Akun & Login Web]
 1. Identitas & Titik Alamat Rumah                                    │
 2. 📷 Smart OCR Resep/Buku KMS ➔ Parse Obat                         ▼
 3. Input Kontak Keluarga (Bisa >1 Anak)        [2. Cari Wilayah RT Domisili Orang Tua]
 4. Penugasan Relawan Terdekat (Proximity)                            │
        │                                              ┌──────────────┴──────────────┐
        │                                              ▼                             ▼
        │                                       (RT Sudah Terdaftar)       (RT Belum Terdaftar)
        │                                       • Bot WA & Obat: AKTIF     • Data tersimpan, sapaan WA
        │                                       • Relawan: Menunggu Kader  • Keluarga dapat share link
        │                                         Verifikasi & Assign RT     ajak RT bergabung.
        │                                              │                             │
        │                                              └──────────────┬──────────────┘
        │                                                             │
        │                                                             ▼
        │                                              [3. Input Data Ortu & OCR Obat]
        │                                                             │
        └──────────────────────────────┬──────────────────────────────┘
                                       │
                                       ▼  (API: POST /api/elderly)
            ┌─────────────────────────────────────────────────────────────┐
            │ 📲 SISTEM MENGEKSEKUSI RESPON MULTI-KANAL SECARA OTOMATIS   │
            ├─────────────────────────────────────────────────────────────┤
            │ 1. WhatsApp Seluruh Keluarga Terdaftar (Token Unik):       │
            │    "Pendaftaran Ibu Siti berhasil! Pantau kondisi harian:   │
            │     https://kabarin-api.atherizz.dev/status/token_anak_1"   │
            │                                                             │
            │ 2. WhatsApp Lansia (Sapaan & Pengingat Obat Langsung Aktif):│
            │    "Assalamu’alaikum / Selamat pagi Ibu Siti 🙂             │
            │     Saya Kabarin, asisten kesehatan digital dari RT 01 yang │
            │     diminta tolong oleh Mas Rian (anak Ibu) & Bu Endang     │
            │     (Kader RT) untuk menemani dan mengingatkan jadwal obat  │
            │     Ibu setiap pagi jam 07:00.                              │
            │     Jika Ibu berkenan ditemani, cukup balas 'Iya' ya Bu 🙂" │
            │                                                             │
            │ 3. (Khusus Jalur B) WhatsApp Alert ke Kader RT:             │
            │    "Bu Endang, ada warga baru didaftarkan oleh anaknya      │
            │     (Ibu Siti - Jl. Melati 4). Sapaan bot sudah aktif.      │
            │     Silakan buka dashboard untuk verifikasi alamat &        │
            │     tunjuk relawan pendamping RT nggih."                    │
            └─────────────────────────────────────────────────────────────┘
```

#### 🛡️ Detail Logika di Flow 2:
1. **Model Verifikasi Cepat (Khusus Pendaftaran oleh Keluarga):**
   - **Bot WhatsApp & Pengingat Obat $\rightarrow$ LANGSUNG AKTIF (Tanpa Menunggu):** Orang tua langsung disapa dan diingatkan minum obat sejak hari pertama tanpa perlu menunggu approval RT.
   - **Kunjungan Fisik Relawan $\rightarrow$ MENUNGGU VERIFIKASI KADER:** Kader RT memverifikasi alamat domisili di dashboard dan menugaskan relawan tetangga terdekat. Jika data fiktif atau salah RT, Kader berhak menolak atau memindahkan wilayah.
2. **Mekanisme Penugasan Relawan Harian (*Proximity & Workload Matching*):**
   - Sistem menghitung jarak geografis secara matematis menggunakan **formula Haversine** antara koordinat rumah lansia dan rumah relawan (< 100 meter) serta memeriksa kuota beban tugas aktif (< 5 binaan) — *murni kalkulasi matematis database tanpa beban AI*.
   - Di form Kader muncul rekomendasi terurut: `[⭐ Rekomendasi Terdekat: Mas Budi (Jarak 25m, 1 Binaan Aktif)]`. Kader tinggal 1-klik setuju (*Human-in-the-Loop*).

---

### 🟢 FLOW 3: Penambahan Anggota Keluarga Lain (Multi-Family Connection)

Dalam realitas masyarakat Indonesia, satu orang tua sering memiliki banyak anak yang tinggal di kota berbeda (misal: anak pertama di Jakarta, anak kedua di Surabaya, anak ketiga di Kalimantan).

> **Prinsip Akses Keluarga:**
> Setiap anggota keluarga yang ditambahkan **tidak diwajibkan membuat akun web**. Sistem memberikan **Link Token Unik Pribadi (`/status/:token`)** ke nomor WhatsApp masing-masing anak agar mereka bisa langsung memantau orang tua tanpa perlu login.

```
                 ALUR PENAMBAHAN ANGGOTA KELUARGA BARU (MULTI-FAMILY)
                                          │
          ┌───────────────────────────────┴───────────────────────────────┐
          ▼                                                               ▼
 [JALUR A: DARI SISI KADER RT]                                   [JALUR B: DARI SISI KELUARGA]
 (Kader login ➔ Buka /elderly/:id ➔ Tab Keluarga)                (Anak login di /family/dashboard ➔ Profil Ortu)
          │                                                               │
          ▼                                                               ▼
 [Klik "+ Tambah Anggota Keluarga"]                              [Klik "+ Undang Kontak Saudara"]
 • Input: Nama Anak ke-2 (e.g. Mbak Maya)                        • Input: Nama Saudara (e.g. Mbak Maya)
 • Hubungan: Anak Kandung / Cucu / Menantu                       • Hubungan: Kakak / Adik / Menantu
 • Nomor WhatsApp (e.g. 081299887766)                            • Nomor WhatsApp (e.g. 081299887766)
 • Set as Primary Contact? (Toggle Ya/Tidak)                     • Switch: Izinkan Terima Alert Darurat
          │                                                               │
          └───────────────────────────────┬───────────────────────────────┘
                                          │
                                          ▼ (API: POST /api/elderly/:id/family)
              ┌───────────────────────────────────────────────────────────────┐
              │ 📲 SISTEM OTOMATIS MENGEKSEKUSI 2 AKSI PENTING:               │
              ├───────────────────────────────────────────────────────────────┤
              │ 1. GENERATE TOKEN AKSES UNIK BARU:                            │
              │    Sistem membuat token 64-karakter khusus untuk Mbak Maya    │
              │    (contoh: /status/token_maya_sec889)                        │
              │                                                               │
              │ 2. KIRIM NOTIFIKASI RESMI WHATSAPP KE NOMOR MBAK MAYA:        │
              │    "Halo Mbak Maya! 👋                                        │
              │     Anda telah didaftarkan sebagai kontak keluarga pemantau   │
              │     untuk Ibu Siti (71 tahun) di wilayah RT 01 / RW 10.       │
              │                                                               │
              │     Pantau kondisi harian, jadwal minum obat, dan log         │
              │     kunjungan relawan Ibu Siti secara real-time di sini:      │
              │     👉 https://kabarin-api.atherizz.dev/status/token_maya_sec │
              │                                                               │
              │     (Catatan: Anda tidak perlu login untuk memantau status).  │
              │     (Opsional) Jika ingin membuka dashboard web lengkap:      │
              │     👉 Buat akun di https://kabarin.atherizz.dev/register"    │
              └───────────────────────────────────────────────────────────────┘
```

---

### 🟢 FLOW 4: Pendaftaran Relawan 1-Pintu oleh Kader RT

Untuk menjaga data tetap valid dan mencegah pendaftar liar dari luar RT, akun relawan **hanya dapat didaftarkan satu pintu oleh Kader RT**:

```
[1. Kader RT Buka Menu /volunteers di Dashboard] ──► Klik "+ Tambah Relawan"
                         │
                         ▼
[2. Kader Mengisi Data Relawan Tetangga]
• Nama Lengkap (e.g. Mas Budi Santoso)
• Nomor WhatsApp (e.g. 081277665544)
• Email (e.g. budi@gmail.com)
• Alamat Rumah / Titik GPS (Untuk kalkulasi jarak ke rumah lansia < 100m)
                         │
                         ▼ (API: POST /api/volunteers)
[3. Sistem Otomatis Membuat Akun & Kredensial]
• Akun dibuat di database (role: volunteer)
• Diberikan password sementara (e.g. "Kabarin2026!")
                         │
                         ▼
[4. WhatsApp Resmi Otomatis Dikirim ke Nomor Relawan]
"Halo Mas Budi! 🙂
 Anda telah didaftarkan sebagai Relawan Pendamping Lansia oleh Bu Endang (Kader RT 01).
 
 Anda akan menerima pesan WhatsApp otomatis jika ada warga lansia binaan yang membutuhkan kunjungan/verifikasi.
 
 (Opsional) Jika Mas Budi ingin membuka Dashboard Web Relawan:
 🌐 Login: https://kabarin.atherizz.dev/login
 📧 Email: budi@gmail.com
 🔑 Password Sementara: Kabarin2026!
 (Disarankan langsung mengganti password setelah login pertama kali)"
```

---

### 🟢 FLOW 5: Interaksi Harian WhatsApp & AI Care Agent (Lansia)

> **Fleksibilitas Input (Voice Note Opsional):** Lansia bebas merespons menggunakan **pesan teks biasa** (mengetik) ATAU **rekaman suara (*Voice Note*)**. Fitur suara sangat membantu lansia yang memiliki penglihatan rabun, jari gemetar (*tremor*), atau kesulitan mengetik di layar HP.

```
[Jadwal Pagi Terjadwal — Misal Jam 07:00 WIB]
               │
               ▼
[Bot Kabarin Mengirimkan Sapaan Hangat & Pengingat Obat via WhatsApp]
"Assalamu’alaikum Mbah Sumo, selamat pagi 🙂
 Jangan lupa minum obat Amlodipine 1 tablet setelah sarapan nggih.
 Pagi ini badan terasa sehat atau ada keluhan Mbah?"
               │
               ▼
[Lansia Merespons — BEBAS PILIH CARA:]
├─► OPSI 1: Mengetik Pesan Teks ("Alhamdulillah sehat le")
└─► OPSI 2: Mengirim Voice Note Suara (🎙️ Bicara Bahasa Indonesia / Jawa)
               │
               ▼
[AI Care Agent Memproses Balasan]
(Jika Voice Note ➔ Ditranskripsi otomatis oleh Whisper API ke Teks)
               │
       ┌───────┴───────────────────────┬───────────────────────┐
       ▼                               ▼                       ▼
[Kondisi A: Sehat / Normal]   [Kondisi B: Keluhan Sakit]   [Kondisi C: Tidak Merespons]
Lansia balas sehat & sudah    Lansia mengeluh pusing,      Lansia tidak membalas hingga
minum obat.                   lemas, atau nyeri dada.      batas waktu toleransi habis.
       │                               │                               │
       ▼                               ▼                               ▼
[Status Lansia: HIJAU]        [Status Lansia: KUNING/MERAH] [Status Lansia: KUNING]
AI membalas ramah dan         AI menenangkan lansia dan    Sistem otomatis mengaktifkan
mencatat kepatuhan obat       memicu eskalasi relawan      penugasan kunjungan ke relawan
ke database.                  secara otomatis.             untuk verifikasi langsung.
```

---

### 🟢 FLOW 6: Konfigurasi Rantai Eskalasi Per Lansia & Alur Tanggap Darurat

> **Prinsip Utama:**
> Setiap lansia memiliki **konfigurasi eskalasi pribadi** yang ditentukan saat onboarding oleh kader atau keluarga. Tidak semua orang perlu tahu untuk setiap kejadian — sistemnya bertahap dan proporsional, disesuaikan dengan konteks sosial masing-masing keluarga.

#### 📋 A. Konfigurasi Rantai Eskalasi Saat Onboarding Lansia

Saat mendaftarkan lansia (Form Step 4), kader/keluarga mengisi preferensi kontak eskalasi pribadi:

```
KONFIGURASI RANTAI ESKALASI — Mbah Sumo (Contoh)
──────────────────────────────────────────────────────────────────
Relawan Utama (Primary Responder):
  👤 Mas Budi Santoso  |  Jarak: 30m  |  Binaan aktif: 2 orang
  ↳ Dihubungi PERTAMA di Tier 1 & Tier 2

Relawan Cadangan (Secondary Responder):
  👤 Ibu Wati Rahayu   |  Jarak: 60m  |  Binaan aktif: 1 orang
  ↳ Fallback jika Mas Budi tidak respons >10 menit di Tier 1,
    atau dipanggil SERENTAK dengan Mas Budi di Tier 3

Family Primary Contact:
  👤 Mas Rian (Anak ke-1, Malang)  |  WA: 081200001111
  ↳ Dihubungi mulai Tier 2 & Tier 3
  ↳ Dipilih karena paling responsif & paling dekat secara fisik

Family Emergency Contacts (Semua Kontak):
  👤 Mbak Maya (Anak ke-2, Jakarta)  |  WA: 081299887766
  👤 Pak Arif (Menantu, Malang)      |  WA: 082188776655
  ↳ Hanya dihubungi saat Tier 3 (Darurat Kritis)
──────────────────────────────────────────────────────────────────
Catatan: Primary Responder tidak harus relawan formal RT.
Bisa diisi cucu yang tinggal 1 gang, tetangga dekat,
atau siapa saja yang paling cepat bisa datang ke lokasi.
```

#### 📊 B. Breakdown Tindakan Per Tingkat Urgensi (Tier)

```
[Pemicu Eskalasi Terdeteksi oleh AI Care Agent]
              │
     ┌────────┴──────────────────────────────────────────────────────┐
     │                                                               │
     ▼                                                               ▼
[Klasifikasi Otomatis dari Kondisi Lansia]            [Manual: Tombol SOS ditekan Keluarga]
                                                       ➔ Langsung masuk Tier 3
     │
     ├──────────────────────────────┬────────────────────────────────────────────┐
     │                              │                                            │
     ▼                              ▼                                            ▼

╔════════════════════════╗  ╔════════════════════════════╗  ╔════════════════════════════════╗
║  🟡 TIER 1             ║  ║  🟠 TIER 2                 ║  ║  🔴 TIER 3                     ║
║  PERHATIAN             ║  ║  PERINGATAN                ║  ║  DARURAT KRITIS                ║
╠════════════════════════╣  ╠════════════════════════════╣  ╠════════════════════════════════╣
║ PEMICU:                ║  ║ PEMICU:                    ║  ║ PEMICU:                        ║
║ • Tidak balas sapaan   ║  ║ • Lansia mengeluh lemas,   ║  ║ • Gejala stroke / tidak sadar  ║
║   melewati grace period║  ║   pusing, mual, atau nyeri ║  ║ • Jatuh / cedera fisik         ║
║ • Pengingat obat ke-2  ║  ║ • Relawan Tier 1 lapor     ║  ║ • Tidak ada respons setelah    ║
║   tidak dibalas        ║  ║   butuh pantau lebih lanjut║  ║   relawan Tier 1 sudah cek     ║
║                        ║  ║                            ║  ║ • Tombol SOS ditekan keluarga  ║
╠════════════════════════╣  ╠════════════════════════════╣  ╠════════════════════════════════╣
║ SIAPA YANG DIHUBUNGI:  ║  ║ SIAPA YANG DIHUBUNGI:      ║  ║ SIAPA YANG DIHUBUNGI:          ║
║                        ║  ║                            ║  ║                                ║
║ • Relawan Utama        ║  ║ • Relawan Utama (Primary)  ║  ║ • Relawan Utama + Cadangan     ║
║   (Primary saja)       ║  ║   + Relawan Cadangan       ║  ║   (SERENTAK, tidak bertahap)   ║
║                        ║  ║ • Family Primary Contact   ║  ║ • Family Primary Contact       ║
║ ⚠️ Keluarga TIDAK      ║  ║   (1 kontak keluarga       ║  ║ • SEMUA Family Emergency       ║
║    dihubungi di Tier 1 ║  ║   yang paling responsif)   ║  ║   Contacts                     ║
║    (Cegah alarm fatigue║  ║                            ║  ║ • Dashboard Kader: Kartu       ║
║    harian berlebihan)  ║  ║ ℹ️ Kader dapat notif di    ║  ║   Darurat Merah Menyala        ║
║                        ║  ║    dashboard, tidak via WA ║  ║ • Kader mendapat WA alert      ║
║                        ║  ║                            ║  ║   prioritas tinggi             ║
╠════════════════════════╣  ╠════════════════════════════╣  ╠════════════════════════════════╣
║ AKSI RELAWAN:          ║  ║ AKSI RELAWAN:              ║  ║ AKSI RELAWAN:                  ║
║                        ║  ║                            ║  ║                                ║
║ • Cek ke rumah lansia  ║  ║ • Kunjungan fisik langsung ║  ║ • Tiba di lokasi, evaluasi     ║
║ • Isi form cepat       ║  ║ • Dampingi & pantau lansia ║  ║   kondisi darurat              ║
║   /lapor/:token        ║  ║ • Koordinasi dengan Family ║  ║ • Hubungi 119 / IGD jika       ║
║ • Laporkan: Aman atau  ║  ║   Primary jika perlu       ║  ║   diperlukan                   ║
║   Perlu Tindakan Lanjut║  ║   tindakan medis           ║  ║ • Update status via form       ║
║   (➔ eskalasi Tier 2)  ║  ║                            ║  ║   /lapor/:token                ║
╠════════════════════════╣  ╠════════════════════════════╣  ╠════════════════════════════════╣
║ FALLBACK (>10 menit):  ║  ║ FALLBACK (>10 menit):      ║  ║ FALLBACK:                      ║
║                        ║  ║                            ║  ║                                ║
║ Primary tidak respons  ║  ║ Kedua relawan tidak respons║  ║ Broadcast ke SELURUH relawan   ║
║ ➔ Hubungi Secondary    ║  ║ ➔ WA alert langsung ke     ║  ║ aktif RT + WA Kader untuk      ║
║   Responder            ║  ║   Kader RT                 ║  ║   koordinasi langsung          ║
╚════════════════════════╝  ╚════════════════════════════╝  ╚════════════════════════════════╝
```

#### 📲 C. Contoh Nyata: Eskalasi Mbah Sumo Step-by-Step

```
[Mbah Sumo tidak membalas sapaan jam 07:00 hingga jam 08:30]
                              │
                              ▼
       [AI mendeteksi timeout grace period — Tier 1 aktif]
                              │
                              ▼
  [WA ke Mas Budi — Primary Responder, jarak 30m:]
  "Mas Budi, Mbah Sumo (No. 12 Jl. Mawar) belum membalas
   sapaan kami sejak jam 07:00. Bisa minta tolong dicek
   sebentar nggih? 🙏
   Laporan cepat: https://kabarin.id/lapor/token_budi_sumo"

  [Keluarga: TIDAK dihubungi — mungkin Mbah hanya ke pasar]
                              │
              ┌───────────────┴─────────────────────────────────┐
              ▼                                                 ▼
   [Mas Budi datang & cek]                   [Mas Budi tidak respons > 10 mnt]
              │                                                 │
              ▼                                                 ▼
   ┌──────────┴──────────────┐            [WA ke Ibu Wati — Secondary Responder:]
   ▼                         ▼            "Ibu Wati, tolong bantu cek Mbah Sumo
[Laporan: AMAN]   [Laporan: PERLU BANTU]  ya Bu, Mas Budi belum bisa dihubungi 🙏"
   │                         │
   ▼                         ▼
Status HIJAU ✅          Naik ke TIER 2:
Keluarga tidak         • WA ke Mas Rian (Family Primary Contact)
perlu tahu.            • Relawan Utama + Cadangan dipanggil bersama
                       • Kader mendapat notif di dashboard
```

#### 🔄 D. Setelah Relawan Menyelesaikan Kunjungan

```
[Relawan Isi Laporan via /lapor/:token atau Dashboard Web]
                              │
                              ▼
  [Sistem Memperbarui Status Secara Real-Time ke Seluruh Pihak]
  • Status lansia kembali HIJAU setelah terverifikasi aman
  • Catatan kunjungan tersimpan di riwayat profil lansia
  • Keluarga yang terdaftar mendapat notif WA:
    "Mbah Sumo sudah dikunjungi Mas Budi jam 09:15.
     Kondisi: Aman, beliau tadi sedang tidur 🙂"
```

---

### 🟢 FLOW 7: Alur Kerja Dashboard Kader RT (`/dashboard`)

Dashboard Kader difokuskan pada **pengawasan wilayah, briefing operasional, dan tindakan cepat**:

1. **Pantauan Status Wilayah (*Priority Status Cards*):**
   - Menampilkan metrik ringkasan RT: Total Lansia, Lansia Aman, Butuh Perhatian, dan Kondisi Darurat.
   - Menempatkan lansia yang membutuhkan tindakan segera di bagian paling atas (*Priority Action Feed*).
2. **Briefing Operasional Pagi (*Daily Operational Briefing*):**
   - Menyajikan kartu rangkuman otomatis berbasis AI setiap pagi yang menyintesis siapa saja lansia yang belum merespons, eskalasi berjalan, serta pendaftaran baru dalam 30 detik pertama.
3. **Deteksi Dini Penurunan Respons (*Early Welfare Anomaly Alert*):**
   - Algoritma *rule-based* yang mendeteksi perubahan pola sapaan harian (misal pergeseran rata-rata waktu respons lansia yang melambat secara signifikan selama 3 hari berturut-turut).
4. **Manajemen Direktori Lansia (`/elderly`):**
   - Pencarian warga lansia berdasarkan nama, status kesehatan, atau nomor rumah.
   - Membuka profil detail lansia: riwayat percakapan WhatsApp (termasuk rekaman suara & transkripsi), daftar obat harian, data keluarga, dan log kunjungan relawan.
5. **Pendaftaran Relawan Baru 1-Pintu (`/volunteers` ➔ Modal Tambah Relawan):**
   - Menambah relawan tetangga dan mengelola beban penugasan.
6. **Verifikasi Pengajuan Warga Baru dari Keluarga:**
   - Meninjau data lansia yang didaftarkan mandiri oleh anak/kerabat dan menugaskan relawan pendamping.
7. **Kelola Kontak Keluarga Tambahan (`/elderly/:id` ➔ Tab Keluarga):**
   - Menambah kontak anak ke-2, anak ke-3, dll. Sistem langsung mengirim link status token ke WA masing-masing.
8. **Log Riwayat Eskalasi (`/escalations`):**
   - Rekam jejak seluruh insiden darurat yang pernah terjadi di RT beserta histori penanganannya.

---

### 🟢 FLOW 8: Alur Kerja Dashboard Relawan (`/volunteer`)

Dashboard Relawan dirancang untuk **mempermudah relawan tetangga mengelola tugas binaan**:

```
                       [Relawan Menerima WhatsApp Pendaftaran]
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
 [JALUR A: TUGAS DI LAPANGAN (Tanpa Login)]     [JALUR B: AKSES DASHBOARD WEB]
 Saat ada lansia butuh dicek ➔ Relawan         Relawan login di /login dengan email &
 klik link /lapor/:token di WA ➔ Isi 1 menit   password sementara yang dikirim via WA
                                                                 │
                                                                 ▼
                                                        /volunteer/dashboard
                                                                 │
                                 ┌───────────────────────────────┼───────────────────────────────┐
                                 ▼                               ▼                               ▼
                       [Daftar Lansia Binaan]          [Tugas Kunjungan Aktif]        [Profil & Ganti Password]
                       Daftar kakek/nenek tetangga     Notifikasi jika ada lansia     Relawan dapat mengganti
                       yang menjadi tanggung jawabnya. binaan yang perlu dicek.       password secara mandiri.
```

- **Dua Pilihan Akses Relawan:**
  1. **Akses Cepat (Tanpa Login):** Mengklik tautan `/lapor/:token` langsung dari pesan WhatsApp saat tiba di lokasi (selesai $<1$ menit). Formulir ini secara otomatis dilengkapi **Contextual Visit Guide**, yaitu 3–5 butir panduan observasi fisik sederhana yang di-generate dinamis oleh AI berbasis riwayat medis lansia (misal: protokol FAST stroke untuk riwayat hipertensi) berupa checklist ya/tidak praktis untuk relawan awam non-medis.
  2. **Akses Dashboard Web:** Login untuk melihat seluruh lansia binaan, riwayat laporan sebelumnya, jadwal kunjungan rutin, dan mengganti password akunnya sendiri.

---

### 🟢 FLOW 9: Alur Kerja Dashboard Keluarga (`/family`)

Dashboard Keluarga dirancang untuk **memberikan transparansi penuh bagi anak rantau / kerabat**:

```
                      [Keluarga Login ke Web]
                                 │
                                 ▼
                      /family/dashboard
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
[Status Terkini Orang Tua] [Histori Kepatuhan Obat] [Log Kunjungan Relawan]
Kondisi hari ini (Aman/    Grafik & checklist obat  Kapan terakhir relawan
Sedang dicek relawan).     yang sudah/belum diminum mengecek ke rumah.
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
     [+ Tambah Kontak Saudara]       [Tombol Darurat On-Demand]
     Menambahkan WhatsApp kakak/adik "Minta Relawan Tetangga Cek Sekarang"
     agar ikut menerima notifikasi   (Memicu kunjungan langsung jika cemas)
```

- **Tiga Kanal Pemantauan Keluarga:**
  1. **Akses Cepat (Tanpa Login):** Membuka tautan `/status/:token` dari pesan WhatsApp untuk pemantauan instan hari ini (status sapaan, riwayat obat 7 hari, kontak relawan, dan tombol On-Demand SOS).
  2. **Rangkuman Mingguan Otomatis (*Weekly Welfare Digest via WhatsApp*):** Setiap Minggu pagi, sistem mengirimkan pesan rangkuman 7 hari terakhir (kepatuhan minum obat, respon sapaan harian, dan catatan kunjungan relawan) secara proaktif ke WhatsApp seluruh keluarga tanpa perlu login web.
  3. **Akses Dashboard Web:** Login untuk mengelola profil orang tua, menambahkan kontak saudara lain (*kakak/adik*), melihat histori obat jangka panjang, dan memicu permintaan cek fisik relawan.

---
