import type { AIProvider } from "@/types";
import { GLMProvider } from "./glm";
import { MockProvider } from "./mock";
import { OpenAIProvider } from "./openai";
import { AnthropicProvider } from "./anthropic";
import { OllamaProvider } from "./ollama";

class ProviderRegistry {
  private providers: Map<string, AIProvider> = new Map();

  constructor() {
    // Always register Mock
    this.register(new MockProvider());

    // Auto-detect providers from environment variables
    this.autoDetectProviders();
  }

  private autoDetectProviders() {
    // GLM
    if (process.env.GLM_API_KEY) {
      this.register(new GLMProvider());
    }

    // OpenAI
    if (process.env.OPENAI_API_KEY) {
      this.register(new OpenAIProvider());
    }

    // Anthropic
    if (process.env.ANTHROPIC_API_KEY) {
      this.register(new AnthropicProvider());
    }

    // Ollama (local, always register — it'll fail gracefully if not running)
    this.register(new OllamaProvider());
  }

  register(provider: AIProvider) {
    this.providers.set(provider.name.toLowerCase(), provider);
  }

  get(name: string): AIProvider | undefined {
    return this.providers.get(name.toLowerCase());
  }

  getAll(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  getProviderNames(): string[] {
    return Array.from(this.providers.keys());
  }

  createProvider(
    name: string,
    apiKey: string,
    baseUrl?: string
  ): AIProvider {
    const normalized = name.toLowerCase();

    if (normalized === "glm ai / zai" || normalized === "glm") {
      const provider = new GLMProvider(apiKey, baseUrl);
      return provider;
    }
    if (normalized === "openai") {
      return new OpenAIProvider(apiKey, baseUrl);
    }
    if (normalized === "anthropic") {
      return new AnthropicProvider(apiKey, baseUrl);
    }
    if (normalized === "ollama") {
      return new OllamaProvider(baseUrl);
    }
    if (normalized === "mock" || normalized === "mock provider") {
      return new MockProvider();
    }
    throw new Error(`Unknown provider: ${name}`);
  }
}

export const providerRegistry = new ProviderRegistry();
