# Kabarin

> Community-based elderly welfare monitoring and early warning system combining proactive WhatsApp check-ins, context-aware AI triage, and multi-tier escalation.

---

## Overview

**Kabarin** is an end-to-end monitoring platform engineered to address the vulnerability of solitary and high-risk elderly citizens at the local community (RT/RW) level. The system bridges non-tech-savvy seniors with local neighborhood volunteers (*Relawan*) and medical services through everyday conversational interfaces.

### Core Capabilities

- **Zero-Friction Conversational Check-ins:** Proactive, scheduled daily check-ins delivered directly via WhatsApp (powered by Baileys) without requiring elderly users to install or learn new mobile applications.
- **Context-Aware AI Triage:** Classifies natural language responses using LLMs, factoring in each senior's personal medical history and comorbidities to distinguish routine reports from emergent health risks.
- **Multi-Tier Escalation Engine:** A deterministic state machine managing rapid responses:
  - **Tier 1:** Local neighborhood volunteer alert for on-site physical welfare checks.
  - **Tier 2:** Primary family and RT administrator alert for non-responsive or developing concerns.
  - **Tier 3:** Direct coordination with local health clinics (*Puskesmas*) and emergency services for critical conditions.
- **Role-Based Web Dashboard:** Administrative, volunteer, and family portal for real-time welfare tracking, assignment dispatching, and audit logging.

---

## Architecture & Monorepo Structure

The project is structured as a TypeScript monorepo powered by **Bun Workspaces** and **Turborepo** to enforce strict separation of concerns, end-to-end type safety, and zero code duplication across services.

```
kabarin/
├── apps/
│   ├── api/                    # Backend server (Hono + Bun + Chanfana OpenAPI + Scalar)
│   └── web/                    # Frontend web application (Astro + Svelte 5)
│
├── packages/
│   ├── types/                  # Shared Zod schemas, DTOs, Enums, and Result pattern
│   ├── db/                     # Drizzle ORM schemas, migrations, and PostgreSQL client
│   └── auth/                   # Better Auth server factory and client SDK wrapper
│
├── package.json                # Root package workspace definition
├── tsconfig.base.json          # Shared compiler options
└── turbo.json                  # Turborepo task pipeline configuration
```

### Module Responsibilities

| Package / App | Responsibility | Key Technologies |
|---|---|---|
| **`@kabarin/types`** | Single Source of Truth for shared data contracts, validation rules, and domain models. Zero runtime overhead. | TypeScript, Zod |
| **`@kabarin/db`** | Database schema definitions, relations, and migration management. Isolated from client applications. | Drizzle ORM, postgres.js, PostgreSQL |
| **`@kabarin/auth`** | Authentication server configuration (email/password & OAuth) and client authentication SDK. | Better Auth |
| **`apps/api`** | HTTP REST API, WhatsApp bot socket handler, background cron scheduler, and AI triage service. | Hono, Chanfana, Scalar, Baileys |
| **`apps/web`** | Responsive administrative, volunteer, and family dashboard. | Astro, Svelte 5 |

---

## Tech Stack

- **Runtime:** [Bun](https://bun.sh) (v1.1+)
- **Monorepo Engine:** [Turborepo](https://turbo.build) (v2.x)
- **Backend Framework:** [Hono](https://hono.dev)
- **API Spec & Validation:** [Chanfana](https://github.com/cloudflare/chanfana) (OpenAPI 3.1)
- **Interactive Documentation:** [Scalar](https://scalar.com)
- **Database & ORM:** [PostgreSQL 16](https://www.postgresql.org) (Local or Serverless like [Neon](https://neon.tech) / [Supabase](https://supabase.com)) with [Drizzle ORM](https://orm.drizzle.team)
- **Authentication:** [Better Auth](https://www.better-auth.com)

---

## Getting Started

### Prerequisites

Ensure you have the following installed or accessible:

- **[Bun](https://bun.sh)** (`>= 1.1.0`)
- **[PostgreSQL](https://www.postgresql.org)** (`>= 15`) — either running locally on your machine or provisioned via a managed serverless provider (such as [Neon](https://neon.tech) or [Supabase](https://supabase.com)).
- **Node.js** (`>= 20.0.0` for tooling compatibility)

### 1. Installation

Clone the repository and install all workspace dependencies:

```bash
git clone https://github.com/your-org/kabarin.git
cd kabarin
bun install
```

### 2. Environment Configuration

Kabarin utilizes `.env` for root workspace scripts (database migrations & seeding) and `apps/api/.dev.vars` for the Cloudflare Workers local runtime.

Copy both environment templates:

```bash
# Windows (PowerShell)
copy .env.example .env
copy apps\api\.dev.vars.example apps\api\.dev.vars

# macOS / Linux
cp .env.example .env
cp apps/api/.dev.vars.example apps/api/.dev.vars
```

Ensure both `.env` and `apps/api/.dev.vars` contain your active database connection string and Better Auth secret:

```env
# Database Connection String (Serverless PostgreSQL Neon)
DATABASE_URL="postgresql://neondb_owner:your_password@ep-xxx-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Better Auth Configuration
BETTER_AUTH_URL="http://localhost:8787"
BETTER_AUTH_SECRET="6177f086ac498001dcb2c84e8fa9904f7042598d4f63116cd01c5c0fd73de7c1"
```

### 3. Database Initialization & Seeding

Synchronize the Drizzle schema with your PostgreSQL database, then populate it with demo data:

```bash
# 1. Push schema tables to database
bun run db:push

# 2. Seed demo accounts, RT territories, elderly profiles, and test tokens
bun run seed
```

### 4. Running the Development Environment

Launch all workspace applications (API + Web) concurrently:

```bash
bun dev
```

The services will be available at:

- **API Server:** `http://localhost:8787`
- **Interactive API Documentation (Scalar):** `http://localhost:8787/docs`
- **OpenAPI 3.1 Specification:** `http://localhost:8787/openapi/all.json`
- **Health Check Endpoint:** `http://localhost:8787/health`

---

## Available Scripts

Run these commands from the root directory:

| Command | Description |
|---|---|
| `bun dev` | Starts all applications concurrently via Turborepo |
| `bun run build` | Builds all packages and applications |
| `bun run seed` | Seeds database with RT territories, 5 demo accounts, elderly, and checkin logs |
| `bun run db:push` | Synchronizes Drizzle schema directly with the connected database |
| `bun run db:generate` | Generates SQL migration files from schema modifications |
| `bun run db:migrate` | Applies pending SQL migrations to the database |
| `bun run db:studio` | Launches Drizzle Studio GUI for visual database management |

---

## 🧪 Testing Credentials & Demo Accounts

For testing endpoints across different roles in Scalar API Docs (`/docs`) or web dashboards, use these pre-provisioned demo accounts (all accounts share the password `Kabarin2026!`):

| Role | Name | Email | Password | Scope & Responsibilities |
|---|---|---|---|---|
| 🏢 **Cadre (`cadre`)** | Ibu Endang Astuti | `kader@gmail.com` | `Kabarin2026!` | RT Territory Management, Elderly Onboarding & Verification, Volunteer Assignments, Medication Schedules, Check-in Monitoring, & Triage Dashboard |
| 🤝 **Volunteer 1 (`volunteer`)** | Mas Dimas Prasetyo | `relawan@gmail.com` | `Kabarin2026!` | Volunteer Portal, Assigned Elderly Care List, Check-in History Transcripts, & Field Visit Reports |
| 🤝 **Volunteer 2 (`volunteer`)** | Mas Dimas Wahyu | `relawan2@gmail.com` | `Kabarin2026!` | Secondary / Backup Neighborhood Caregiver |
| 👨‍👩‍👧 **Family 1 (`family`)** | Budi Hidayat | `keluarga@gmail.com` | `Kabarin2026!` | Bottom-Up Elderly Parent Registration, Medication Management, & Daily Check-in Audio Transcripts |
| 👨‍👩‍👧 **Family 2 (`family`)** | Rian Hidayat | `keluarga2@gmail.com` | `Kabarin2026!` | Secondary Emergency Family Contact & Welfare Monitoring |

> [!TIP]
> Navigate to **`http://localhost:8787/docs`** to test API endpoints interactively via Scalar Docs. Use the top-left dropdown selector to switch between isolated role specifications (`Cadre`, `Volunteer`, `Family`, `Public`, `All`)!

---

## License

This project is licensed under the MIT License.