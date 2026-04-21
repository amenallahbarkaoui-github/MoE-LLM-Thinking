export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatParams {
  messages: ChatMessage[];
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  content: string;
  model: string;
  usage: TokenUsage;
}

/** Token usage statistics from a provider call */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/** A single chunk in a streaming response */
export interface StreamingChunk {
  content: string;
  done: boolean;
}

/** Streaming chat response — async iterable of string chunks */
export interface StreamingChatResponse {
  [Symbol.asyncIterator](): AsyncIterator<string>;
}

/** Describes what a provider can do */
export interface ProviderCapabilities {
  supportsStreaming: boolean;
  supportsTools: boolean;
  maxContextWindow: number;
  supportedModalities: ("text" | "image" | "audio")[];
}

export interface AIProvider {
  name: string;
  baseUrl: string;
  models: string[];
  concurrencyLimit: number;
  rateLimit: { rpm: number; tpm: number };
  chat(params: ChatParams): Promise<ChatResponse>;
  streamChat(params: ChatParams): AsyncGenerator<string, void, unknown>;
  validateApiKey(key: string): Promise<boolean>;
  getAvailableModels(): Promise<string[]>;
  getTokenUsage(): TokenUsage | null;
  getCapabilities(): ProviderCapabilities;
}

export interface ProviderConfig {
  name: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  concurrencyLimit: number;
}
