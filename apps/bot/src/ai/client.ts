import OpenAI from "openai";

export function getAzureOpenAIClient(): {
  client: OpenAI;
  deploymentName: string;
} {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const deploymentName =
    process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-5.4-mini";

  if (!apiKey || !endpoint) {
    throw new Error(
      "Kredensial Azure OpenAI belum dikonfigurasi. Harap set AZURE_OPENAI_API_KEY dan AZURE_OPENAI_ENDPOINT di .env."
    );
  }

  const client = new OpenAI({
    apiKey,
    baseURL: endpoint,
    defaultHeaders: {
      "api-key": apiKey,
    },
  });

  return { client, deploymentName };
}
