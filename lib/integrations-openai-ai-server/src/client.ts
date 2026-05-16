import OpenAI from "openai";

const apiKey =
  process.env.OPENAI_API_KEY ||
  process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

if (!apiKey) {
  throw new Error(
    "OPENAI_API_KEY (or AI_INTEGRATIONS_OPENAI_API_KEY) must be set.",
  );
}

// Auto-detect Groq keys (start with gsk_) and use Groq base URL
const isGroqKey = apiKey.startsWith("gsk_");
const defaultBaseURL = isGroqKey
  ? "https://api.groq.com/openai/v1"
  : "https://api.openai.com/v1";

const baseURL =
  process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ||
  process.env.OPENAI_BASE_URL ||
  defaultBaseURL;

export const openai = new OpenAI({ apiKey, baseURL });
