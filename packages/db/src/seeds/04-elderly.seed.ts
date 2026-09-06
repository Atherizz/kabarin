import type { AppDatabase } from "../create-db";
import { elderly } from "../schema";
import {
  COMMUNITY_RT01_ID,
  ELD_SOEPARDI_ID,
  ELD_AMINAH_ID,
  ELD_KARTOWIJOYO_ID,
  ELD_SRI_ID,
  ELD_DJOJODIGDO_ID,
} from "./constants";

export async function seedElderly(db: AppDatabase, authUsers: Record<string, any>) {
  await db.insert(elderly).values([
    // Mbah Soepardi
    {
      id: ELD_SOEPARDI_ID,
      communityUnitId: COMMUNITY_RT01_ID,
      name: "Mbah Soepardi",
      phone: "085648907716",
      age: 76,
      gender: "male",
      address: "Jl. Kalpataru No. 45",
      rt: "01",
      rw: "10",
      latitude: -7.948,
      longitude: 112.624,
      mobilityStatus: "independent",
      monitoringMode: "active",
      currentStatus: "green",
      verificationStatus: "verified",
      riskScore: 25,
      medicalHistory: "Hipertensi Derajat 2, Riwayat Stroke Ringan 2024",
      preferredCheckinTime: "07:00",
      notes: "Tinggal sendiri, rumah pagar hijau depan musholla Al-Ikhlas.",
      createdBy: authUsers["kader@gmail.com"]?.id,
      defaultChecklist: [
        { question: "Apakah Mbah Soepardi bisa bicara dengan jelas, tidak pelo atau pelo tiba-tiba?", type: "yes_no" },
        { question: "Apakah wajahnya simetris, tidak ada yang terlihat miring atau turun sebelah?", type: "yes_no" },
        { question: "Apakah kedua tangannya bisa diangkat dan digerakkan dengan normal?", type: "yes_no" },
        { question: "Apakah mengeluh sakit kepala hebat, pusing berputar, atau pandangan kabur?", type: "yes_no" },
        { question: "Apakah sudah minum obat hipertensinya hari ini?", type: "yes_no" },
      ],
    },
    // Mbah Kartowijoyo
    {
      id: ELD_KARTOWIJOYO_ID,
      communityUnitId: COMMUNITY_RT01_ID,
      name: "Mbah Kartowijoyo",
      phone: null,
      age: 82,
      gender: "male",
      address: "Jl. Kalpataru Gg. 2 No. 8",
      rt: "01",
      rw: "10",
      latitude: -7.9495,
      longitude: 112.6238,
      mobilityStatus: "homebound",
      monitoringMode: "passive",
      currentStatus: "red",
      verificationStatus: "verified",
      riskScore: 85,
      medicalHistory: "Pasca Stroke Berat, Tirah Baring, Penyakit Jantung Koroner",
      preferredCheckinTime: "06:30",
      notes: "Tirah baring (bedridden), tidak memegang HP, pemantauan via kunjungan relawan & keluarga.",
      createdBy: authUsers["kader@gmail.com"]?.id,
      defaultChecklist: [
        { question: "Apakah Mbah Kartowijoyo sadar penuh dan bisa merespons saat dipanggil namanya?", type: "yes_no" },
        { question: "Apakah ada sesak napas, napas cepat, atau terlihat kesulitan bernapas saat berbaring?", type: "yes_no" },
        { question: "Apakah ada bengkak baru di kaki, pergelangan, atau perut terlihat lebih besar?", type: "yes_no" },
        { question: "Apakah ada luka tekan (lecet/kemerahan) di punggung, pinggang, atau tumit akibat tirah baring?", type: "yes_no" },
        { question: "Apakah nyeri dada atau terlihat kesakitan dengan ekspresi wajah menyeringai?", type: "yes_no" },
      ],
    },
  ]);
}
