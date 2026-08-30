export const BOT_TEMPLATES = {
  elderlyWelcome: (name: string, rt: string, rw: string): string =>
    `Assalamu'alaikum / Selamat pagi Mbah *${name}* 🙂\n\n` +
    `Saya *Kabarin*, asisten kesehatan digital dari RT ${rt} / RW ${rw} yang diminta tolong oleh keluarga dan pengurus RT untuk menemani serta mengingatkan jadwal minum obat Mbah setiap pagi.\n\n` +
    `Mulai besok pagi, kami akan menyapa Mbah lewat WhatsApp ini nggih. Jika ada keluhan atau butuh bantuan, Mbah cukup balas pesan ini (bisa ketik atau kirim rekaman suara / Voice Note).`,

  familyLinked: (
    familyName: string,
    elderlyName: string,
    rt: string,
    statusUrl: string
  ): string =>
    `Halo ${familyName} 👋\n\n` +
    `Pendaftaran orang tua Anda, Mbah *${elderlyName}*, di program pemantauan Kabarin RT ${rt} telah aktif.\n\n` +
    `Pantau kondisi harian, kepatuhan minum obat, dan riwayat kunjungan relawan secara real-time di sini:\n` +
    `👉 ${statusUrl}\n\n` +
    `_(Anda tidak perlu login untuk memantau halaman status ini)_`,

  volunteerProvisioned: (
    name: string,
    email: string,
    tempPass: string,
    loginUrl: string
  ): string =>
    `Halo Mas/Mbak *${name}* 🙂\n\n` +
    `Anda telah didaftarkan sebagai *Relawan Pendamping Lansia* oleh pengurus RT di sistem Kabarin.\n\n` +
    `Anda akan menerima pesan WhatsApp otomatis jika ada warga lansia binaan yang memerlukan kunjungan fisik.\n\n` +
    `_(Opsional) Jika ingin membuka Dashboard Web Relawan:_\n` +
    `🌐 Login: ${loginUrl}\n` +
    `📧 Email: ${email}\n` +
    `🔑 Password: ${tempPass}\n` +
    `_(Disarankan mengganti password setelah login pertama kali)_`,

  volunteerAssigned: (volunteerName: string, elderlyName: string, rt: string): string =>
    `Halo Mas/Mbak *${volunteerName}* 👋\n\n` +
    `Anda telah ditugaskan sebagai relawan pendamping untuk Mbah *${elderlyName}* di RT ${rt}.\n\n` +
    `Jika beliau memerlukan kunjungan atau pemeriksaan fisik, notifikasi penugasan kunjungan akan dikirimkan ke WhatsApp ini. Terima kasih atas kepedulian Anda 🙏`,
};
