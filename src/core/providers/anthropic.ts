import type { ChatParams, ChatResponse, ChatMessage, ProviderCapabilities, TokenUsage } from "@/types";
import { BaseProvider } from "./base";

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

export class AnthropicProvider extends BaseProvider {
  name = "Anthropic";
  baseUrl: string;
  models = ["claude-sonnet-4-20250514", "claude-3-5-sonnet-20241022", "claude-3-opus-20240229", "claude-3-haiku-20240307"];
  concurrencyLimit = 5;
  rateLimit = { rpm: 300, tpm: 300000 };

  constructor(apiKey?: string, baseUrl?: string) {
    super();
    this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY || "";
    this.baseUrl = baseUrl || "https://api.anthropic.com/v1";
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsStreaming: true,
      supportsTools: true,
      maxContextWindow: 200000,
      supportedModalities: ["text", "image"],
    };
  }

  private convertMessages(messages: ChatMessage[]): { system?: string; messages: AnthropicMessage[] } {
    let system: string | undefined;
    const converted: AnthropicMessage[] = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        system = msg.content;
      } else {
        converted.push({ role: msg.role, content: msg.content });
      }
    }

    // Anthropic requires messages to start with a user message
    if (converted.length === 0 || converted[0].role !== "user") {
      converted.unshift({ role: "user", content: "Hello" });
    }

    return { system, messages: converted };
  }

  async chat(params: ChatParams): Promise<ChatResponse> {
    const url = `${this.baseUrl}/messages`;
    const { system, messages } = this.convertMessages(params.messages);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const body: Record<string, unknown> = {
        model: params.model || "claude-sonnet-4-20250514",
        messages,
        max_tokens: params.maxTokens ?? 4096,
        temperature: params.temperature ?? 0.7,
      };
      if (system) body.system = system;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        const error = new Error(
          `Anthropic API error: ${response.status} ${response.statusText} - ${errorBody}`
        );
        (error as NodeJS.ErrnoException).code = String(response.status);
        throw error;
      }

      const data = await response.json();
      return this.parseAnthropicResponse(data);
    } finally {
      clearTimeout(timeout);
    }
  }

  async *streamChat(params: ChatParams): AsyncGenerator<string, void, unknown> {
    const url = `${this.baseUrl}/messages`;
    const { system, messages } = this.convertMessages(params.messages);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    try {
      const body: Record<string, unknown> = {
        model: params.model || "claude-sonnet-4-20250514",
        messages,
        max_tokens: params.maxTokens ?? 4096,
        temperature: params.temperature ?? 0.7,
        stream: true,
      };
      if (system) body.system = system;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        throw new Error(
          `Anthropic API streaming error: ${response.status} ${response.statusText} - ${errorBody}`
        );
      }

      if (!response.body) {
        throw new Error("Anthropic API returned no response body for streaming");
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

            try {
              const parsed = JSON.parse(data);

              if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                yield parsed.delta.text;
              }

              // Track usage from message_delta event
              if (parsed.type === "message_delta" && parsed.usage) {
                this.lastTokenUsage = {
                  promptTokens: this.lastTokenUsage?.promptTokens || 0,
                  completionTokens: parsed.usage.output_tokens || 0,
                  totalTokens: (this.lastTokenUsage?.promptTokens || 0) + (parsed.usage.output_tokens || 0),
                };
              }

              // Track input tokens from message_start event
              if (parsed.type === "message_start" && parsed.message?.usage) {
                this.lastTokenUsage = {
                  promptTokens: parsed.message.usage.input_tokens || 0,
                  completionTokens: 0,
                  totalTokens: parsed.message.usage.input_tokens || 0,
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

  private parseAnthropicResponse(data: Record<string, unknown>): ChatResponse {
    const content = data.content as Array<{ type: string; text: string }>;
    const usage = data.usage as {
      input_tokens?: number;
      output_tokens?: number;
    } | undefined;

    const textContent = content
      ?.filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("") || "";

    const tokenUsage: TokenUsage = {
      promptTokens: usage?.input_tokens || 0,
      completionTokens: usage?.output_tokens || 0,
      totalTokens: (usage?.input_tokens || 0) + (usage?.output_tokens || 0),
    };

    this.lastTokenUsage = tokenUsage;

    return {
      content: textContent,
      model: (data.model as string) || "",
      usage: tokenUsage,
    };
  }
}
