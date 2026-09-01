import Groq from "groq-sdk";

let instance: Groq | null = null;

export function getGroqClient(): Groq {
  if (instance) return instance;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY not configured. Please set the GROQ_API_KEY environment variable in your .env file."
    );
  }

  instance = new Groq({ apiKey });
  return instance;
}
