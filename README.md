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
│   └── web/                    # Frontend web application (Astro + SvelteKit)
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
| **`apps/web`** | Responsive administrative, volunteer, and family dashboard. | Astro, SvelteKit |

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

Copy the example environment template to create your root `.env` file:

```bash
# Windows (PowerShell)
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

Open `.env` and configure your environment variables:

```env
# Database Connection String (Local PostgreSQL instance or Managed Serverless Neon/Supabase)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kabarin_db"

# Better Auth Configuration
BETTER_AUTH_URL="http://localhost:8787"
BETTER_AUTH_SECRET="generate_a_secure_32_character_secret"

# Server Settings
PORT=8787
NODE_ENV="development"
```

### 3. Database Initialization & Migration

Ensure your local PostgreSQL database is created and reachable, or paste your managed serverless connection string into `DATABASE_URL`. Then push the Drizzle schema:

```bash
bun run db:push
```

### 4. Running the Development Environment

Launch all workspace applications and background processes:

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
| `bun dev` | Starts all applications in watch mode via Turborepo |
| `bun run build` | Builds all packages and applications with topological dependency resolution |
| `bun run lint` | Runs linter and TypeScript compiler checks across all workspaces |
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