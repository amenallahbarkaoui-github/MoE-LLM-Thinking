import type { ChatParams, ChatResponse, AIProvider, TokenUsage, ProviderCapabilities } from "@/types";

export abstract class BaseProvider implements AIProvider {
  abstract name: string;
  abstract baseUrl: string;
  abstract models: string[];
  abstract concurrencyLimit: number;
  abstract rateLimit: { rpm: number; tpm: number };

  protected apiKey: string = "";
  protected lastTokenUsage: TokenUsage | null = null;

  setApiKey(key: string) {
    this.apiKey = key;
  }

  abstract chat(params: ChatParams): Promise<ChatResponse>;

  async *streamChat(params: ChatParams): AsyncGenerator<string, void, unknown> {
    // Default fallback: call chat() and yield the full response as a single chunk
    const response = await this.chat(params);
    yield response.content;
  }

  getTokenUsage(): TokenUsage | null {
    return this.lastTokenUsage;
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsStreaming: false,
      supportsTools: false,
      maxContextWindow: 4096,
      supportedModalities: ["text"],
    };
  }

  async validateApiKey(key: string): Promise<boolean> {
    const oldKey = this.apiKey;
    try {
      this.apiKey = key;
      await this.chat({
        messages: [{ role: "user", content: "test" }],
        model: this.models[0],
        maxTokens: 5,
      });
      return true;
    } catch {
      return false;
    } finally {
      this.apiKey = oldKey;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    return this.models;
  }

  protected parseOpenAIResponse(data: Record<string, unknown>): ChatResponse {
    const choices = data.choices as Array<{
      message: { content: string };
    }>;
    const usage = data.usage as {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    } | undefined;

    const tokenUsage: TokenUsage = {
      promptTokens: usage?.prompt_tokens || 0,
      completionTokens: usage?.completion_tokens || 0,
      totalTokens: usage?.total_tokens || 0,
    };

    this.lastTokenUsage = tokenUsage;

    return {
      content: choices?.[0]?.message?.content || "",
      model: (data.model as string) || "",
      usage: tokenUsage,
    };
  }
}
