import { config } from "dotenv";
import { resolve } from "path";
import { sql } from "drizzle-orm";
import { createDB } from "./create-db";
import { createAuth } from "@kabarin/auth";

import { seedCommunities } from "./seeds/01-communities.seed";
import { seedAuthUsers } from "./seeds/02-auth-users.seed";
import { seedVolunteers } from "./seeds/03-volunteers.seed";
import { seedElderly } from "./seeds/04-elderly.seed";
import { seedMedications } from "./seeds/05-medications.seed";
import { seedFamily } from "./seeds/06-family.seed";
import { seedAssignments } from "./seeds/07-assignments.seed";
import { seedCheckins } from "./seeds/08-checkins.seed";
import { seedEscalations } from "./seeds/09-escalations.seed";
import { seedVisits } from "./seeds/10-visits.seed";

// 1. Load root .env
config({ path: resolve(__dirname, "../../../.env") });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("❌ DATABASE_URL is not defined in .env file!");
  process.exit(1);
}

const authSecret =
  process.env.BETTER_AUTH_SECRET ||
  "6177f086ac498001dcb2c84e8fa9904f7042598d4f63116cd01c5c0fd73de7c1";
const authBaseUrl = process.env.BETTER_AUTH_URL || "http://localhost:8787";

const db = createDB(databaseUrl);
const auth = createAuth(db, {
  baseURL: authBaseUrl,
  secret: authSecret,
});

async function main() {
  console.log("\n🌱 ========================================================");
  console.log("   KABARIN — END-TO-END MODULAR DATABASE SEEDING");
  console.log("========================================================\n");

  // 1. Clean Database Wipe (Guaranteed Idempotent Reset)
  console.log("🧹 [1/10] Wiping database tables (TRUNCATE ... CASCADE)...");
  await db.execute(sql`
    TRUNCATE TABLE 
      chat_messages,
      volunteer_visits,
      escalation_logs,
      checkin_sessions,
      elderly_volunteers,
      elderly_medications,
      elderly_family,
      elderly,
      volunteers,
      session,
      account,
      verification,
      "user",
      community_units
    CASCADE;
  `);
  console.log("   ✅ Database wiped cleanly.");

  // 2. Communities
  console.log("\n🏢 [2/10] Seeding Community Units (RT Territories)...");
  await seedCommunities(db);
  console.log("   ✅ Seeded 2 Community Units (RT 01 & RT 02 Jatimulyo, Malang).");

  // 3. Auth Users
  console.log("\n🔐 [3/10] Provisioning Better Auth Accounts (Password: Kabarin2026!)...");
  const authUsers = await seedAuthUsers(auth, db);
  console.log("   ✅ Created 5 Better Auth Accounts with verified status.");

  // 4. Volunteers
  console.log("\n🤝 [4/10] Seeding Volunteer Caregiver Profiles...");
  await seedVolunteers(db, authUsers);
  console.log("   ✅ Seeded 2 Active Neighborhood Volunteers.");

  // 5. Elderly
  console.log("\n👴👵 [5/10] Seeding Elderly Profiles (5 Status Scenarios)...");
  await seedElderly(db, authUsers);
  console.log("   ✅ Seeded 5 Seniors (Green, Yellow, Red, Grey, Pending).");

  // 6. Medications
  console.log("\n💊 [6/10] Seeding Medication Schedules...");
  await seedMedications(db);
  console.log("   ✅ Seeded Active Medication Schedules.");

  // 7. Family
  console.log("\n👨‍👩‍👧 [7/10] Seeding Family Contacts with Authentic 64-Hex Tokens...");
  const familyTokens = await seedFamily(db, authUsers);
  console.log("   ✅ Seeded Family Contacts and Access Tokens.");

  // 8. Assignments
  console.log("\n📋 [8/10] Seeding Volunteer Caregiver Assignments...");
  await seedAssignments(db);
  console.log("   ✅ Seeded Primary & Secondary Volunteer Assignments.");

  // 9. Checkins & Transcripts
  console.log("\n💬 [9/10] Seeding Checkin Sessions & AI Triage Results...");
  await seedCheckins(db);
  console.log("   ✅ Seeded Today's Checkin Sessions and AI Triage Findings.");

  // 10. Escalations & Visits
  console.log("\n🚨 [10/10] Seeding Active Escalations & Field Visit Tasks...");
  await seedEscalations(db);
  const visitTokens = await seedVisits(db);
  console.log("   ✅ Seeded Active Escalations and Field Visit Tasks.");

  // Summary
  console.log("\n🎉 ========================================================");
  console.log("   DATABASE SEEDING COMPLETED SUCCESSFULLY!");
  console.log("========================================================\n");

  console.log("🔑 TEST USER ACCOUNTS (Password: Kabarin2026!):");
  console.log("┌─────────────────────┬───────────────────┬──────────────┬───────────────────────────────┐");
  console.log("│ Role                │ Email             │ Password     │ Name                          │");
  console.log("├─────────────────────┼───────────────────┼──────────────┼───────────────────────────────┤");
  console.log("│ 🏢 Cadre (Kader RT) │ kader@gmail.com   │ Kabarin2026! │ Ibu Endang Astuti (RT 01)     │");
  console.log("│ 🤝 Volunteer 1      │ relawan@gmail.com │ Kabarin2026! │ Mas Dimas Prasetyo            │");
  console.log("│ 🤝 Volunteer 2      │ relawan2@gmail.com│ Kabarin2026! │ Mas Dimas Wahyu               │");
  console.log("│ 👨‍👩‍👧 Family 1         │ keluarga@gmail.com│ Kabarin2026! │ Budi Hidayat (Anak Soepardi)  │");
  console.log("│ 👨‍👩‍👧 Family 2         │ keluarga2@gmail.com│Kabarin2026! │ Rian Hidayat (Anak Aminah)    │");
  console.log("└─────────────────────┴───────────────────┴──────────────┴───────────────────────────────┘\n");

  console.log("🔗 LIVE ZERO-LOGIN TEST TOKENS & URLs:");
  console.log("┌──────────────────────────────────────────┬──────────────────────────────────────────────────────────┐");
  console.log("│ Target Surface                           │ Live URL / Token                                         │");
  console.log("├──────────────────────────────────────────┼──────────────────────────────────────────────────────────┤");
  console.log(`│ 👨‍👩‍👧 Public Status Mbah Soepardi (Green)   │ http://localhost:8787/api/family/status/${familyTokens.tokenSoepardiFamily.slice(0, 16)}... │`);
  console.log(`│ 👨‍👩‍👧 Public Status Mbah Aminah (Yellow)    │ http://localhost:8787/api/family/status/${familyTokens.tokenAminahFamily.slice(0, 16)}... │`);
  console.log(`│ 📱 1-Tap Mobile Visit Form Mbah Sri      │ http://localhost:8787/api/visits/form/${visitTokens.tokenVisitSri.slice(0, 16)}...   │`);
  console.log("└──────────────────────────────────────────┴──────────────────────────────────────────────────────────┘");
  console.log(`\nFull Visit Form Token: ${visitTokens.tokenVisitSri}`);
  console.log(`Full Soepardi Family Token: ${familyTokens.tokenSoepardiFamily}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seeding failed with error:", err);
    process.exit(1);
  });
