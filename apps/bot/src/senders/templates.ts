export const BOT_TEMPLATES = {
  elderlyWelcome: (name: string, rt: string, rw: string): string =>
    `Assalamu'alaikum / Selamat pagi Mbah *${name}*.\n\n` +
    `Ini nomor resmi layanan Kabarin dari pengurus RT ${rt} / RW ${rw}. Atas persetujuan keluarga, kami akan menemani dan mengingatkan jadwal minum obat Mbah setiap pagi.\n\n` +
    `Mulai besok pagi, pesan sapaan akan dikirimkan ke WhatsApp ini. Jika Mbah merasa kurang enak badan atau butuh bantuan, Mbah cukup membalas pesan ini lewat tulisan atau rekaman suara.`,

  familyLinked: (
    familyName: string,
    elderlyName: string,
    rt: string,
    statusUrl: string
  ): string =>
    `Halo ${familyName},\n\n` +
    `Pendaftaran pemantauan untuk Mbah *${elderlyName}* di RT ${rt} sudah aktif.\n\n` +
    `Perkembangan kondisi harian, jadwal obat, dan kunjungan relawan dapat dipantau langsung melalui tautan berikut:\n` +
    `${statusUrl}\n\n` +
    `Halaman status di atas dapat diakses langsung tanpa perlu login.`,

  volunteerProvisioned: (
    name: string,
    email: string,
    tempPass: string,
    loginUrl: string
  ): string =>
    `Halo ${name},\n\n` +
    `Anda telah didaftarkan sebagai Relawan Pendamping Lansia oleh pengurus RT di sistem Kabarin.\n\n` +
    `Nomor WhatsApp ini akan menerima pemberitahuan penugasan apabila ada lansia binaan yang memerlukan kunjungan fisik.\n\n` +
    `Akses dasbor relawan:\n` +
    `Tautan: ${loginUrl}\n` +
    `Email: ${email}\n` +
    `Kata Sandi: ${tempPass}\n` +
    `Disarankan segera mengganti kata sandi setelah masuk pertama kali.`,

  volunteerAssigned: (volunteerName: string, elderlyName: string, rt: string): string =>
    `Halo ${volunteerName},\n\n` +
    `Pengurus RT menugaskan Anda sebagai relawan pendamping untuk Mbah *${elderlyName}* di RT ${rt}.\n\n` +
    `Pemberitahuan akan dikirimkan ke nomor ini jika beliau memerlukan kunjungan atau verifikasi kondisi di lapangan. Terima kasih atas kesediaannya.`,

  cadreNewElderlySubmissionAlert: (
    cadreName: string,
    elderlyName: string,
    rt: string,
    familyName: string
  ): string =>
    `*Pemberitahuan Pendaftaran Lansia Baru — RT ${rt}*\n\n` +
    `Ibu/Bapak Kader ${cadreName},\n` +
    `Terdapat pengajuan pemantauan lansia baru dari pihak keluarga:\n` +
    `- Nama Lansia: Mbah ${elderlyName}\n` +
    `- Didaftarkan oleh: ${familyName}\n\n` +
    `Jadwal sapaan harian dan pengingat obat sudah aktif. Mohon lakukan verifikasi data serta penetapan relawan pendamping melalui Dasbor Kader.`,

  familyVolunteerAssigned: (
    familyName: string,
    elderlyName: string,
    volunteerName: string,
    isPrimary: boolean,
    statusUrl: string
  ): string =>
    `Halo ${familyName},\n\n` +
    `Pengurus RT telah menetapkan *${volunteerName}* sebagai relawan pendamping ${
      isPrimary ? "utama" : "cadangan"
    } untuk Mbah *${elderlyName}*.\n\n` +
    `Pantau perkembangan kondisi beliau di tautan berikut:\n` +
    `${statusUrl}`,

  familyEscalationResolved: (
    familyName: string,
    elderlyName: string,
    volunteerName: string,
    notes: string,
    statusUrl: string
  ): string =>
    `*Laporan Kunjungan Selesai — RT*\n\n` +
    `Halo ${familyName},\n` +
    `Relawan ${volunteerName} telah selesai melakukan kunjungan ke rumah Mbah *${elderlyName}*.\n\n` +
    `Hasil Kunjungan:\n` +
    `${notes}\n` +
    `Status Terkini: Aman / Terverifikasi\n\n` +
    `Detail laporan kunjungan dapat dilihat di:\n` +
    `${statusUrl}`,
};
