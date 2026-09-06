import type { ChatCompletionTool } from "openai/resources/chat/completions";

const DOMAIN_WHITELIST =
  "site:alodokter.com OR site:halodoc.com OR site:ayosehat.kemkes.go.id";

interface SerpApiOrganicResult {
  title: string;
  link: string;
  snippet: string;
}

interface SerpApiResponse {
  organic_results?: SerpApiOrganicResult[];
  error?: string;
}

export const SEARCH_HEALTH_TOOL: ChatCompletionTool = {
  type: "function",
  function: {
    name: "search_health_info",
    description:
      "Cari informasi kesehatan dari sumber terpercaya Indonesia (Alodokter, Halodoc, AyoSehat Kemenkes). " +
      "Gunakan HANYA untuk pertanyaan tentang obat, gejala ringan, atau edukasi kesehatan umum. " +
      "JANGAN gunakan jika lansia menunjukkan kondisi darurat (nyeri dada, sesak berat, stroke, jatuh).",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Topik kesehatan dalam Bahasa Indonesia. Maksimal 10 kata.",
        },
      },
      required: ["query"],
    },
  },
};

export async function searchHealthInfo(query: string): Promise<string> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    return "Layanan pencarian informasi kesehatan tidak tersedia saat ini.";
  }

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", `${query} ${DOMAIN_WHITELIST}`);
  url.searchParams.set("hl", "id");
  url.searchParams.set("gl", "id");
  url.searchParams.set("num", "3");
  url.searchParams.set("api_key", apiKey);

  console.log(`\n[health-search] Executing Google Health Search: "${query}"`);

  try {
    const res = await fetch(url.toString());
    const data = (await res.json()) as SerpApiResponse;

    if (data.error || !data.organic_results?.length) {
      console.log(`[health-search] No organic results found for "${query}" (error: ${data.error || "none"})`);
      return "Tidak ditemukan informasi relevan dari sumber kesehatan terpercaya.";
    }

    console.log(`[health-search] Found ${data.organic_results.length} results from trusted sources:`);
    for (const [i, r] of data.organic_results.slice(0, 3).entries()) {
      let domain = "unknown";
      try {
        domain = new URL(r.link).hostname.replace(/^www\./, "");
      } catch {}
      console.log(`   [${i + 1}] [${domain}] ${r.title}`);
      console.log(`       URL: ${r.link}`);
      console.log(`       Cuplikan: ${r.snippet.slice(0, 90)}...`);
    }

    const snippets = data.organic_results
      .slice(0, 3)
      .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\nSumber: ${r.link}`)
      .join("\n\n");

    return `Informasi dari sumber kesehatan terpercaya:\n\n${snippets}`;
  } catch (error) {
    console.error("[health-search] SerpAPI fetch failed:", error);
    return "Gagal mengambil informasi kesehatan. Gunakan pengetahuan umum yang tersedia.";
  }
}
