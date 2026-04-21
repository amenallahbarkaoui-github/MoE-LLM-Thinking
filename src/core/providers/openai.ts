import type { ChatParams, ChatResponse, ProviderCapabilities } from "@/types";
import { BaseProvider } from "./base";

export class OpenAIProvider extends BaseProvider {
  name = "OpenAI";
  baseUrl: string;
  models = ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"];
  concurrencyLimit = 10;
  rateLimit = { rpm: 500, tpm: 600000 };

  constructor(apiKey?: string, baseUrl?: string) {
    super();
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || "";
    this.baseUrl = baseUrl || "https://api.openai.com/v1";
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsStreaming: true,
      supportsTools: true,
      maxContextWindow: 128000,
      supportedModalities: ["text", "image"],
    };
  }

  async chat(params: ChatParams): Promise<ChatResponse> {
    const url = `${this.baseUrl}/chat/completions`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: params.model || "gpt-4o",
          messages: params.messages,
          temperature: params.temperature ?? 0.7,
          max_tokens: params.maxTokens ?? 4096,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        const error = new Error(
          `OpenAI API error: ${response.status} ${response.statusText} - ${errorBody}`
        );
        (error as NodeJS.ErrnoException).code = String(response.status);
        throw error;
      }

      const data = await response.json();
      return this.parseOpenAIResponse(data);
    } finally {
      clearTimeout(timeout);
    }
  }

  async *streamChat(params: ChatParams): AsyncGenerator<string, void, unknown> {
    const url = `${this.baseUrl}/chat/completions`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: params.model || "gpt-4o",
          messages: params.messages,
          temperature: params.temperature ?? 0.7,
          max_tokens: params.maxTokens ?? 4096,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        throw new Error(
          `OpenAI API streaming error: ${response.status} ${response.statusText} - ${errorBody}`
        );
      }

      if (!response.body) {
        throw new Error("OpenAI API returned no response body for streaming");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;
            const data = trimmed.slice(6);
            if (data === "[DONE]") return;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) yield content;

              // Track usage from final chunk
              if (parsed.usage) {
                this.lastTokenUsage = {
                  promptTokens: parsed.usage.prompt_tokens || 0,
                  completionTokens: parsed.usage.completion_tokens || 0,
                  totalTokens: parsed.usage.total_tokens || 0,
                };
              }
            } catch {
              // skip malformed JSON chunks
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } finally {
      clearTimeout(timeout);
    }
  }
}
