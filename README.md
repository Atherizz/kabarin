# Kabarin

> Platform pemantauan kesehatan dan kesejahteraan lansia berbasis komunitas RT dengan integrasi bot WhatsApp, triase medis otomatis berbasis AI, dan alur eskalasi bertingkat.

[![Runtime](https://img.shields.io/badge/Runtime-Bun%20v1.1+-fbf0df?logo=bun&logoColor=black)](https://bun.sh)
[![Monorepo](https://img.shields.io/badge/Monorepo-Turborepo%20v2-ef4444?logo=turborepo&logoColor=white)](https://turbo.build)
[![Backend](https://img.shields.io/badge/API-Hono%20%2B%20Chanfana-e11d48?logo=hono&logoColor=white)](https://hono.dev)
[![Frontend](https://img.shields.io/badge/Web-Astro%20%2B%20Svelte%205-ff5d01?logo=astro&logoColor=white)](https://astro.build)
[![Database](https://img.shields.io/badge/DB-PostgreSQL%20%2B%20Drizzle-336791?logo=postgresql&logoColor=white)](https://orm.drizzle.team)
[![WhatsApp](https://img.shields.io/badge/Bot-Baileys%20Multi--Device-25D366?logo=whatsapp&logoColor=white)](https://github.com/WhiskeySockets/Baileys)
[![Documentation](https://img.shields.io/badge/Docs-Scalar%20OpenAPI%203.1-000000?logo=openapiinitiative&logoColor=white)](http://localhost:8787/docs)

---

## Ringkasan Proyek

Kabarin adalah platform pemantauan harian dan deteksi dini kondisi kesehatan lansia, khususnya yang tinggal sendirian atau memiliki risiko kesehatan tinggi di tingkat Rukun Tetangga (RT/RW). Sistem ini menghubungkan lansia dengan kader RT, relawan tetangga terdekat, keluarga, dan fasilitas kesehatan melalui antarmuka percakapan WhatsApp yang mudah digunakan tanpa perlu instalasi aplikasi baru.

### Fitur Utama

- **Pemeriksaan Harian via WhatsApp:** Sistem mengirimkan sapaan rutin dan pengingat jadwal minum obat secara otomatis. Lansia dapat membalas menggunakan pesan teks maupun rekaman suara (*voice note*).
- **Triase Keluhan Berbasis AI:** Pesan balasan lansia diproses menggunakan model bahasa (Azure OpenAI) untuk mengidentifikasi keluhan berdasarkan riwayat medis dan daftar obat aktif. Sistem juga memanfaatkan pencarian referensi medis (Alodokter dan Halodoc via SerpApi) untuk menjaga akurasi informasi kesehatan.
- **Alur Eskalasi Bertingkat:**
  - **Tier 1 (Tingkat Tetangga):** Mengirimkan notifikasi WhatsApp ke relawan terdekat agar dapat melakukan pengecekan fisik langsung ke rumah lansia.
  - **Tier 2 (Tingkat Keluarga dan Pengurus RT):** Mengirimkan peringatan ke kontak keluarga utama serta menandai status perhatian khusus pada dashboard kader RT.
  - **Tier 3 (Tingkat Faskes):** Menyediakan ringkasan data rujukan medis untuk koordinasi lanjutan dengan Puskesmas atau penanganan medis darurat.
- **Dashboard Web Berbasis Peran:** Dashboard khusus bagi Kader RT, Relawan, dan Keluarga untuk memantau status harian lansia, penugasan kunjungan, dan verifikasi data warga.

---

## Arsitektur Monorepo

Proyek ini menggunakan struktur monorepo berbasis Turborepo dan Bun Workspaces:

```
kabarin/
├── .env                         # Konfigurasi environment untuk database, bot WhatsApp, dan seed
├── apps/
│   ├── api/                     # Backend REST API (Hono, Chanfana OpenAPI 3.1, Scalar Docs)
│   │   ├── wrangler.jsonc       # Konfigurasi deployment Cloudflare Workers
│   │   ├── .dev.vars            # Konfigurasi environment lokal wrangler dev
│   │   └── src/
│   │       ├── endpoints/       # Handler API per domain (Auth, Elderly, Volunteers, Visits, dll)
│   │       ├── middleware/      # Middleware autentikasi, CORS, dan error handling
│   │       └── index.ts         # Inisialisasi aplikasi Hono dan rute API
│   ├── bot/                     # Service bot WhatsApp (Bun runtime)
│   │   └── src/
│   │       ├── ai/              # Integrasi Azure OpenAI, prompt, dan evaluasi triase
│   │       ├── escalation/      # Logika alur eskalasi dan notifikasi darurat
│   │       ├── scheduler/       # Penjadwal pesan sapaan harian dan pengecekan respons
│   │       ├── webhook/         # Server HTTP webhook internal (komunikasi API ke Bot)
│   │       ├── handlers/        # Pemroses pesan masuk WhatsApp (teks dan audio)
│   │       └── client.ts        # Inisialisasi koneksi socket Baileys WhatsApp
│   └── web/                     # Frontend dashboard (Astro, Svelte 5, Tailwind CSS v4)
│       ├── astro.config.mjs     # Konfigurasi Astro SSR
│       └── src/pages/           # Halaman web multi-role (Kader, Relawan, Keluarga)
├── packages/
│   ├── types/                   # Tipe TypeScript bersama, schema validasi Zod, dan DTO
│   ├── db/                      # Schema Drizzle ORM, migrasi database, dan data seed
│   └── auth/                    # Konfigurasi Better Auth (server dan client SDK)
├── package.json                 # Konfigurasi root workspace
├── tsconfig.base.json           # Konfigurasi dasar TypeScript
└── turbo.json                   # Konfigurasi task pipeline Turborepo
```

### Pembagian Modul

| Paket / Aplikasi | Peran | Teknologi |
|---|---|---|
| `@kabarin/types` | Definisi schema validasi Zod, tipe data bersama, dan contoh OpenAPI | TypeScript, Zod, Zod-to-OpenAPI |
| `@kabarin/db` | Schema tabel database (14 tabel), relasi ORM, migrasi, dan seed data | Drizzle ORM, postgres.js, PostgreSQL (Neon) |
| `@kabarin/auth` | Konfigurasi autentikasi Better Auth untuk session dan proteksi akun | Better Auth |
| `apps/api` | REST API, dokumentasi Scalar, OpenAPI spec, dan validasi hak akses role | Hono, Chanfana, Scalar, Cloudflare Workers |
| `apps/bot` | Service bot WhatsApp, transkripsi voice note, triase keluhan, dan webhook | Baileys, Groq SDK, Azure OpenAI, Bun Serve |
| `apps/web` | Dashboard interaktif untuk pengurus RT, relawan, dan keluarga | Astro, Svelte 5, Tailwind CSS v4 |

---

## Tech Stack

- **Runtime:** Bun (`>= 1.1.0`)
- **Monorepo:** Turborepo (`v2.x`)
- **Backend API:** Hono (`v4.x`)
- **Dokumentasi API:** Chanfana (OpenAPI 3.1) dan Scalar
- **Frontend:** Astro (`v7.x`), Svelte 5, Tailwind CSS v4
- **Database:** PostgreSQL 16 (Neon Serverless) dengan Drizzle ORM
- **Autentikasi:** Better Auth
- **WhatsApp Gateway:** Baileys Multi-Device (`^6.7.12`)
- **Transkripsi Audio (STT):** Groq API (`whisper-large-v3`)
- **AI & OCR:** Azure OpenAI Service (`gpt-5.4-mini` / `gpt-4o-mini`)
- **Object Storage:** Cloudflare R2 (penyimpanan gambar resep dan audio voice note)

---

## Spesifikasi Lingkungan Pengujian

Berikut adalah spesifikasi perangkat keras, runtime, database, dan alokasi port yang dibutuhkan untuk menjalankan dan menguji aplikasi:

### 1. Spesifikasi Perangkat Keras

| Komponen | Kebutuhan Minimum | Rekomendasi |
|---|---|---|
| **Sistem Operasi** | Windows 10/11 (64-bit), macOS 13+ (Ventura/Sonoma), atau Linux (Ubuntu 22.04 LTS) | macOS / Linux / Windows 11 (WSL2) |
| **Prosesor (CPU)** | 2 Core, 2.0 GHz (x86_64 atau ARM64) | 4 Core atau lebih |
| **Memori (RAM)** | 4 GB RAM | 8 GB RAM (disarankan saat menjalankan API, Web, dan Bot bersamaan) |
| **Penyimpanan** | Minimal 2 GB ruang kosong | 5 GB SSD |
| **Koneksi Internet** | Diperlukan untuk akses database Neon, model AI Azure/Groq, dan WhatsApp WebSocket | Koneksi internet stabil |

### 2. Runtime dan Perangkat Lunak

| Perangkat Lunak | Versi yang Didukung | Keterangan |
|---|---|---|
| **Bun** | `>= 1.1.0` (Wajib) | Runtime utama untuk package manager, server API, bot, dan skrip database. Cek: `bun -v` |
| **Node.js** | `>= 20.0.0` LTS | Diperlukan untuk utilitas ekosistem dan Cloudflare Wrangler. Cek: `node -v` |
| **Cloudflare Wrangler** | `^4.124.0` | CLI emulator lokal Cloudflare Workers untuk `apps/api`. Cek: `bunx wrangler -v` |
| **Git** | `>= 2.30.0` | Version control system. Cek: `git --version` |
| **Browser** | Chrome 120+, Edge 120+, Firefox 120+, atau Safari 17+ | Untuk mengakses Web Dashboard dan Scalar Docs |

### 3. Database dan Layanan Eksternal

| Layanan | Provider / Tipe | Detail Konfigurasi |
|---|---|---|
| **Database** | PostgreSQL 15 / 16 (disarankan Neon) | String koneksi terenkripsi SSL (`sslmode=require&channel_binding=require`) |
| **Penyimpanan File** | Cloudflare R2 / S3-compatible | Digunakan untuk upload foto resep obat (Smart OCR) dan rekaman audio |
| **Model Bahasa (LLM)** | Azure OpenAI Service | Deployment `gpt-5.4-mini` atau `gpt-4o-mini` (API Version `2024-02-15-preview`) |
| **Transkripsi Suara** | Groq Cloud API | Model `whisper-large-v3` untuk memproses voice note WhatsApp |
| **Pencarian Medis** | SerpApi / Search Engine | Sumber rujukan kesehatan dari Alodokter dan Halodoc |

### 4. Alokasi Port dan Jaringan Lokal (Port Allocation & Local Network)

| Service | Default Port | Protocol | Local Access URL |
|---|---|---|---|
| `apps/api` | **8787** | HTTP / JSON | `http://localhost:8787`<br>`http://localhost:8787/docs` (Scalar Docs) |
| `apps/web` | **4321** | HTTP / HTML | `http://localhost:4321` |
| `apps/bot` | **3001** | HTTP / JSON | `http://localhost:3001` (Internal Webhook Bridge) |
| WhatsApp Socket | *Dynamic* | WSS | Direct connection to WhatsApp gateway via Baileys |

Local origins (`http://localhost:4321`, `http://localhost:8787`, `http://localhost:5173`) are pre-configured in CORS whitelist and `TRUSTED_ORIGINS`.

---

## Panduan Instalasi

Ikuti langkah-langkah berikut untuk memasang dependensi dan menyiapkan database:

### Langkah 1: Kloning Repositori dan Instal Dependensi

```bash
git clone https://github.com/Atherizz/kabarin.git
cd kabarin
bun install
```

### Langkah 2: Menyiapkan File Konfigurasi (.env dan .dev.vars)

Kabarin menggunakan dua file konfigurasi:
1. `.env` di root direktori untuk database Drizzle, skrip seed, dan bot WhatsApp (`apps/bot`).
2. `apps/api/.dev.vars` untuk runtime lokal Cloudflare Wrangler (`apps/api`).

Salin file contoh konfigurasi:

```bash
# Windows (PowerShell)
copy .env.example .env
copy apps\api\.dev.vars.example apps\api\.dev.vars

# macOS / Linux
cp .env.example .env
cp apps/api/.dev.vars.example apps/api/.dev.vars
```

Sesuaikan isi file `.env` dan `apps/api/.dev.vars` dengan kredensial yang Anda gunakan:

```env
# Database PostgreSQL (Neon)
DATABASE_URL="postgresql://neondb_owner:password@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Autentikasi Better Auth
BETTER_AUTH_URL="http://localhost:8787"
BETTER_AUTH_SECRET="6177f086ac498001dcb2c84e8fa9904f7042598d4f63116cd01c5c0fd73de7c1"

# Pengaturan Server
PORT=8787
NODE_ENV="development"
APP_BASE_URL="http://localhost:4321"

# Webhook Bot WhatsApp
BOT_WEBHOOK_PORT=3001
BOT_WEBHOOK_URL="http://localhost:3001"
WEBHOOK_SECRET="kabarin-bot-secret"

# Layanan AI dan STT
AZURE_OPENAI_API_KEY="your-azure-openai-api-key"
AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com/openai/v1/"
AZURE_OPENAI_DEPLOYMENT_NAME="gpt-5.4-mini"
GROQ_API_KEY="gsk_your-groq-api-key"
SERPAPI_KEY="your-serpapi-api-key"

# Cloudflare R2 Storage (Opsional)
R2_ACCOUNT_ID="your-r2-account-id"
R2_ACCESS_KEY_ID="your-r2-access-key-id"
R2_SECRET_ACCESS_KEY="your-r2-secret-access-key"
R2_BUCKET_NAME="kabarin-storage"
R2_PUBLIC_URL="https://cdn.kabarin.atherizz.dev"
```

### Langkah 3: Inisialisasi Database dan Data Demo

Sinkronkan schema tabel Drizzle ke database, kemudian jalankan skrip seeding untuk mengisi data uji coba awal:

```bash
# Sinkronisasi struktur tabel ke database
bun run db:push

# Isi data demo (wilayah RT, akun, lansia, jadwal obat, dan token)
bun run db:seed
```

Skrip `bun run db:seed` membersihkan data lama secara bertahap (`TRUNCATE CASCADE`) dan mengisi kembali data demo yang konsisten sehingga dapat dijalankan berulang kali kapan saja.

---

## Cara Menjalankan Aplikasi

Aplikasi dapat dijalankan melalui beberapa mode berikut:

### Mode 1: Menjalankan API dan Web Dashboard (Uji Coba Cepat)

Untuk menguji fitur web dan API tanpa menyalakan bot WhatsApp:

```bash
bun dev
```

Perintah ini akan menjalankan `apps/api` (port 8787) dan `apps/web` (port 4321) secara bersamaan melalui Turborepo.

### Mode 2: Menjalankan Seluruh Layanan Termasuk WhatsApp Bot

Untuk menguji seluruh alur end-to-end termasuk koneksi WhatsApp:

```bash
bun run dev:all
```

### Mode 3: Menjalankan Setiap Layanan Secara Terpisah

Anda juga dapat menjalankan masing-masing komponen pada terminal terpisah:

```bash
# Terminal 1: REST API (Port 8787)
bun run dev:api

# Terminal 2: Web Frontend (Port 4321)
bun run dev:web

# Terminal 3: Bot WhatsApp dan Webhook (Port 3001)
bun run dev:bot
```

### Panduan Menghubungkan Bot WhatsApp (`apps/bot`)

Saat menjalankan `bun run dev:bot` atau `bun run dev:all`:
1. Terminal akan memunculkan QR Code koneksi WhatsApp Baileys.
2. Buka aplikasi WhatsApp pada ponsel pengujian, pilih menu **Perangkat Tertaut (Linked Devices)**, dan pindai QR Code tersebut.
3. Setelah tersambung, sesi login akan tersimpan pada database dan terminal menampilkan informasi bot siap digunakan:
   ```
   [bot] Ready as [628xxxxxxx@s.whatsapp.net]
   ```

---

## Daftar Layanan dan Dokumentasi

| Layanan | URL Akses | Keterangan |
|---|---|---|
| Dashboard Web Kabarin | `http://localhost:4321` | Antarmuka untuk Kader RT, Relawan, dan Keluarga |
| Pendaftaran Mandiri RT | `http://localhost:4321/register` | Form pendaftaran RT baru berdasarkan wilayah Kemendagri |
| Dokumentasi API (Scalar) | `http://localhost:8787/docs` | Dokumentasi dan pengujian interaktif endpoint API |
| Spesifikasi OpenAPI | `http://localhost:8787/openapi/all.json` | Dokumen schema OpenAPI 3.1 dalam format JSON |
| Pemeriksaan Status API | `http://localhost:8787/health` | Endpoint health check server API |
| Drizzle Studio | `bun run db:studio` | Antarmuka web lokal untuk melihat isi tabel database |

---

## Akun Demo dan Data Pengujian

Data demo yang dihasilkan oleh perintah `bun run db:seed` mencakup akun pengguna, profil lansia, tautan token cepat, dan nomor telepon simulasi:

### 1. Kredensial Akun Pengguna

Seluruh akun demo menggunakan kata sandi: **`Kabarin2026!`**

| Peran | Nama | Email | Kata Sandi | Wilayah / Hubungan | Cakupan Akses |
|---|---|---|---|---|---|
| **Kader RT (`cadre`)** | Ibu Endang Astuti | `kader@gmail.com` | `Kabarin2026!` | RT 01 / RW 10 Jatimulyo, Malang | Kelola wilayah RT, onboarding lansia, OCR resep obat, pendaftaran relawan, dan pemantauan eskalasi. |
| **Relawan RT (`volunteer`)** | Mas Dimas Prasetyo | `relawan@gmail.com` | `Kabarin2026!` | RT 01 / RW 10 Jatimulyo, Malang | Pantau lansia binaan, riwayat sapaan harian, dan pengisian laporan kunjungan fisik. |
| **Keluarga (`family`)** | Budi Hidayat | `keluarga@gmail.com` | `Kabarin2026!` | Anak Mbah Soepardi | Pantau kondisi harian orang tua, riwayat minum obat, dan permintaan kunjungan darurat. |

### 2. Data Lansia Binaan

| Lansia | Status Awal | Riwayat Medis | Metode Pemantauan |
|---|---|---|---|
| **Mbah Soepardi** (76 th) | Hijau (Stabil) | Hipertensi Derajat 2, Riwayat Stroke Ringan 2024. Resep: Amlodipine 10mg. Alamat: Jl. Kalpataru No. 45. | **Aktif via WhatsApp:** Menerima sapaan bot dan dapat merespons via teks atau rekaman suara. |
| **Mbah Kartowijoyo** (82 th) | Merah (Prioritas) | Pasca Stroke Berat, Tirah Baring (*bedridden*), Penyakit Jantung Koroner. Tidak memegang ponsel. | **Pasif via Kunjungan:** Dipantau melalui kunjungan berkala relawan tetangga dan keluarga. |

### 3. Tautan Langsung Akses Cepat (Tanpa Login)

Sistem menyediakan tautan berbasis token aman agar relawan atau keluarga dapat mengakses informasi tertentu secara instan tanpa perlu masuk ke akun:

- **Pemantauan Kesehatan oleh Keluarga:**
  ```
  http://localhost:8787/api/family/status/{TOKEN_KELUARGA}
  ```
- **Formulir Kunjungan Cepat Relawan:**
  Tautan yang dikirimkan via WhatsApp ke relawan saat terjadi alert untuk mengisi hasil observasi kunjungan:
  ```
  http://localhost:8787/api/visits/form/{TOKEN_KUNJUNGAN}
  ```

*(Token unik Mbah Soepardi akan ditampilkan di terminal saat menjalankan `bun run db:seed`).*

### 4. Nomor WhatsApp untuk Simulasi Manual

Jika menguji interaksi bot WhatsApp secara langsung, nomor pengujian berikut telah terdaftar dalam sistem:

| Skenario | Entitas | Nomor Uji Coba | Respon Sistem |
|---|---|---|---|
| Onboarding Lansia | Input Lansia via Form Kader | `085235342960` | Bot mengirim pesan perkenalan awal ke nomor lansia |
| Pendaftaran Relawan | Tambah Relawan via Web Kader | `085738183231` | Relawan menerima kredensial akun awal via WhatsApp |
| Kontak Keluarga | Tambah Keluarga Lansia | `088237348303` | Keluarga menerima tautan pemantauan status lansia |

### 5. Pengujian API via Scalar Docs

1. Pastikan server API berjalan (`bun dev` atau `bun run dev:api`).
2. Buka `http://localhost:8787/docs` di browser.
3. Gunakan menu dropdown di kiri atas untuk memilih kelompok endpoint:
   - `Cadre`: Endpoint pengelolaan wilayah, lansia, relawan, dan resep obat.
   - `Volunteer`: Endpoint penugasan dan laporan kunjungan relawan.
   - `Family`: Endpoint monitoring keluarga dan pendaftaran lansia.
   - `Public`: Endpoint umum (pendaftaran RT, cek ketersediaan wilayah, form kunjungan token).
   - `All Endpoints`: Seluruh spesifikasi API.
4. Klik tombol **Authorize** untuk menguji request dengan login akun demo yang relevan.

---

## Daftar Perintah (Scripts)

Perintah yang dapat dijalankan dari root direktori:

| Perintah | Fungsi |
|---|---|
| `bun dev` | Menjalankan API dan Web secara bersamaan |
| `bun run dev:all` | Menjalankan API, Web, dan Bot WhatsApp secara bersamaan |
| `bun run dev:api` | Menjalankan API server dengan Cloudflare Wrangler (port 8787) |
| `bun run dev:web` | Menjalankan Astro dev server untuk web frontend (port 4321) |
| `bun run dev:bot` | Menjalankan bot WhatsApp dan webhook server (port 3001) |
| `bun run start:bot` | Menjalankan bot WhatsApp mode production |
| `bun run build` | Melakukan build seluruh aplikasi di workspace |
| `bun run check` | Menjalankan pemeriksaan tipe statis TypeScript |
| `bun run lint` | Menjalankan linting kode di seluruh workspace |
| `bun run db:push` | Menerapkan perubahan schema Drizzle ke database |
| `bun run db:seed` | Mengisi database dengan data demo awal |
| `bun run db:generate` | Membuat file migrasi SQL baru dari perubahan schema |
| `bun run db:migrate` | Menjalankan file migrasi SQL ke database |
| `bun run db:studio` | Membuka Drizzle Studio di browser |
| `bun run deploy:api` | Deploy aplikasi API ke Cloudflare Workers |
| `bun run deploy:web` | Deploy aplikasi Web ke Cloudflare Pages |

---

## Lisensi

Proyek ini menggunakan lisensi [MIT License](LICENSE).