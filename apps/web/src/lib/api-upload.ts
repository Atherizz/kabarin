export async function uploadImageAndGetUrl(
  file: File,
  type: "prescription" | "visitPhoto" | "profilePhoto" = "prescription"
): Promise<{ ok: boolean; imageUrl?: string; error?: string }> {
  try {
    const presignRes = await fetch("/api/upload/presigned-url", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        fileName: file.name,
        contentType: file.type,
      }),
    });

    const presignJson = await presignRes.json();

    if (!presignRes.ok || presignJson.success === false) {
      return { ok: false, error: presignJson.error ?? "Gagal menyiapkan unggahan." };
    }

    const { uploadUrl, publicUrl } = presignJson.data;

    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!putRes.ok) {
      return { ok: false, error: "Gagal mengunggah gambar ke penyimpanan." };
    }

    return { ok: true, imageUrl: publicUrl };
  } catch {
    return { ok: false, error: "Koneksi gagal saat mengunggah gambar." };
  }
}