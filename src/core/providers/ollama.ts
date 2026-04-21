import type { ChatParams, ChatResponse, ProviderCapabilities, TokenUsage } from "@/types";
import { BaseProvider } from "./base";

export class OllamaProvider extends BaseProvider {
  name = "Ollama";
  baseUrl: string;
  models = ["llama3.1"];
  concurrencyLimit = 2;
  rateLimit = { rpm: 1000, tpm: 1000000 }; // local, effectively unlimited

  constructor(baseUrl?: string) {
    super();
    this.apiKey = ""; // no key needed for local Ollama
    this.baseUrl = baseUrl || process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsStreaming: true,
      supportsTools: false,
      maxContextWindow: 128000,
      supportedModalities: ["text"],
    };
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return this.models;
      }

      const data = await response.json();
      const models = data.models as Array<{ name: string }> | undefined;
      if (models && models.length > 0) {
        this.models = models.map((m) => m.name);
      }
      return this.models;
    } catch {
      // Ollama might not be running; return defaults
      return this.models;
    }
  }

  async chat(params: ChatParams): Promise<ChatResponse> {
    const url = `${this.baseUrl}/api/chat`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: params.model || "llama3.1",
          messages: params.messages,
          stream: false,
          options: {
            temperature: params.temperature ?? 0.7,
            num_predict: params.maxTokens ?? 4096,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        const error = new Error(
          `Ollama API error: ${response.status} ${response.statusText} - ${errorBody}`
        );
        (error as NodeJS.ErrnoException).code = String(response.status);
        throw error;
      }

      const data = await response.json();
      return this.parseOllamaResponse(data, params.model || "llama3.1");
    } finally {
      clearTimeout(timeout);
    }
  }

  async *streamChat(params: ChatParams): AsyncGenerator<string, void, unknown> {
    const url = `${this.baseUrl}/api/chat`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: params.model || "llama3.1",
          messages: params.messages,
          stream: true,
          options: {
            temperature: params.temperature ?? 0.7,
            num_predict: params.maxTokens ?? 4096,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        throw new Error(
          `Ollama API streaming error: ${response.status} ${response.statusText} - ${errorBody}`
        );
      }

      if (!response.body) {
        throw new Error("Ollama API returned no response body for streaming");
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
            if (!trimmed) continue;

            try {
              const parsed = JSON.parse(trimmed);

              if (parsed.message?.content) {
                yield parsed.message.content;
              }

              // Track usage from final message
              if (parsed.done && parsed.eval_count !== undefined) {
                this.lastTokenUsage = {
                  promptTokens: parsed.prompt_eval_count || 0,
                  completionTokens: parsed.eval_count || 0,
                  totalTokens: (parsed.prompt_eval_count || 0) + (parsed.eval_count || 0),
                };
              }
            } catch {
              // skip malformed JSON lines
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async validateApiKey(_key?: string): Promise<boolean> {
    // Ollama is local and doesn't need an API key; just check connectivity
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private parseOllamaResponse(data: Record<string, unknown>, model: string): ChatResponse {
    const message = data.message as { content: string } | undefined;

    const tokenUsage: TokenUsage = {
      promptTokens: (data.prompt_eval_count as number) || 0,
      completionTokens: (data.eval_count as number) || 0,
      totalTokens: ((data.prompt_eval_count as number) || 0) + ((data.eval_count as number) || 0),
    };

    this.lastTokenUsage = tokenUsage;

    return {
      content: message?.content || "",
      model: (data.model as string) || model,
      usage: tokenUsage,
    };
  }
}
