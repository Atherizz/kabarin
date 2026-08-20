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
• Triase Prioritas Wilayah     • (Akses Cepat: /lapor/:token)  • (Akses Cepat: /status/:token)
```

| Peran (*Role*) | Akses Web Utama | Jalur Pembuatan Akun | Kanal Cepat / Notifikasi | Tanggung Jawab Utama |
|---|---|---|---|---|
| **Kader / Ketua RT** (`cadre`) | **Dashboard Kader** | Registrasi Mandiri (`/register`) | Web App & WhatsApp Alert | Pendaftaran RT, pendataan lansia + OCR obat, mendaftarkan relawan, verifikasi warga baru, dan monitoring triase RT. |
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
2. **Mekanisme Penugasan Relawan Harian (*Geospatial Proximity*):**
   - Sistem menghitung jarak koordinat rumah lansia ke relawan ($<100$ meter) dan kuota binaan masing-masing relawan.
   - Di form Kader muncul rekomendasi: `[⭐ Rekomendasi Terdekat: Mas Budi (Jarak 25m, 1 Binaan)]`. Kader tinggal 1-klik setuju (*Human-in-the-Loop*).

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

### 🟢 FLOW 6: Alur Eskalasi Insiden & Tanggap Darurat Relawan 3-Tier

```
                            [Pemicu Eskalasi Terdeteksi]
                   (Keluhan Sakit / Tidak Balas / Tombol Darurat)
                                         │
                 ┌───────────────────────┼───────────────────────┐
                 ▼                       ▼                       ▼
         [TIER 1: PERHATIAN]     [TIER 2: PERINGATAN]     [TIER 3: DARURAT KRITIS]
         • Tidak balas sapaan    • Keluhan lemas/pusing   • Gejala stroke/jatuh/SOS
         • Obat belum diminum    • Butuh cek fisik        • Butuh evakuasi medis
                 │                       │                       │
                 └───────────────────────┼───────────────────────┘
                                         ▼
                   [Sistem Mengirim Multi-Cast Alert Serentak]
                   1. WhatsApp Relawan Utama: Tugas cek lokasi + link form
                   2. WhatsApp Seluruh Keluarga: Notifikasi status terkini
                   3. Dashboard Kader: Kartu prioritas menyala
                   4. (Emergency Broadcast Fallback: Jika Relawan Utama
                       tidak respons >10 menit ➔ Broadcast ke seluruh relawan RT)
                                         │
                                         ▼
                   [Relawan Datang Mengecek ke Rumah Lansia]
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
   [Opsi A: Form Cepat /lapor/:token]            [Opsi B: Dashboard Relawan di Web]
   Relawan buka link dari WA di HP,               Relawan login ke web, buka data lansia,
   isi kondisi 1 menit, submit selesai.           isi laporan observasi & foto kunjungan.
                                         │
                                         ▼
                   [Sistem Memperbarui Status di Seluruh Dashboard]
                   • Status lansia kembali normal (HIJAU) setelah terverifikasi
                   • Catatan kunjungan tersimpan di rekam riwayat
```

---

### 🟢 FLOW 7: Alur Kerja Dashboard Kader RT (`/dashboard`)

Dashboard Kader difokuskan pada **pengawasan wilayah dan tindakan cepat**:

1. **Pantauan Status Wilayah (Triase Prioritas):**
   - Menampilkan metrik ringkasan RT: Total Lansia, Lansia Aman, Butuh Perhatian, dan Kondisi Darurat.
   - Menempatkan lansia yang membutuhkan tindakan segera di bagian paling atas (*Priority Action Feed*).
2. **Manajemen Direktori Lansia (`/elderly`):**
   - Pencarian warga lansia berdasarkan nama, status kesehatan, atau nomor rumah.
   - Membuka profil detail lansia: riwayat percakapan WhatsApp (termasuk rekaman suara & transkripsi), daftar obat harian, data keluarga, dan log kunjungan relawan.
3. **Pendaftaran Relawan Baru 1-Pintu (`/volunteers` ➔ Modal Tambah Relawan):**
   - Menambah relawan tetangga dan mengelola beban penugasan.
4. **Verifikasi Pengajuan Warga Baru dari Keluarga:**
   - Meninjau data lansia yang didaftarkan mandiri oleh anak/kerabat dan menugaskan relawan pendamping.
5. **Kelola Kontak Keluarga Tambahan (`/elderly/:id` ➔ Tab Keluarga):**
   - Menambah kontak anak ke-2, anak ke-3, dll. Sistem langsung mengirim link status token ke WA masing-masing.
6. **Log Riwayat Eskalasi (`/escalations`):**
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
  1. **Akses Cepat (Tanpa Login):** Mengklik tautan `/lapor/:token` langsung dari pesan WhatsApp saat tiba di lokasi (selesai $<1$ menit).
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

- **Dua Pilihan Akses Keluarga:**
  1. **Akses Cepat (Tanpa Login):** Membuka tautan `/status/:token` dari pesan WhatsApp untuk pemantauan instan hari ini.
  2. **Akses Dashboard Web:** Login untuk mengelola profil orang tua, menambahkan kontak saudara lain (*kakak/adik*), melihat histori obat jangka panjang, dan memicu permintaan cek fisik relawan.

---
