import OpenAI from "openai";
import type { AppEnv } from "../../types/app-env";

export function getAzureOpenAIClient(env?: AppEnv["Bindings"]): {
  client: OpenAI;
  deploymentName: string;
} {
  const apiKey = env?.AZURE_OPENAI_API_KEY || process.env.AZURE_OPENAI_API_KEY;
  const endpoint = env?.AZURE_OPENAI_ENDPOINT || process.env.AZURE_OPENAI_ENDPOINT;
  const deploymentName =
    env?.AZURE_OPENAI_DEPLOYMENT_NAME ||
    process.env.AZURE_OPENAI_DEPLOYMENT_NAME ||
    "gpt-5.4-mini";

  if (!apiKey || !endpoint) {
    throw new Error(
      "Kredensial Azure OpenAI belum dikonfigurasi. Harap set AZURE_OPENAI_API_KEY dan AZURE_OPENAI_ENDPOINT."
    );
  }

  const client = new OpenAI({
    apiKey,
    baseURL: endpoint,
  });

  return { client, deploymentName };
}
