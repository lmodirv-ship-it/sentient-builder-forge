// Lovable AI Gateway provider — server-only.
// Fast, streaming, chat + tools. Default model: google/gemini-3-flash-preview.
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createLovableAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "lovable-ai-gateway",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": apiKey },
  });
}

export const DEFAULT_CHAT_MODEL = "google/gemini-3-flash-preview";
