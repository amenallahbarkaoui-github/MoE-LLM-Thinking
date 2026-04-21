import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ProviderType = "openai" | "anthropic" | "ollama" | "glm" | "mock";

export interface ProviderConfig {
  provider: ProviderType;
  model: string;
  ollamaBaseUrl: string;
}

interface SettingsState {
  providerConfig: ProviderConfig;
  maxAgents: number;
  concurrencyLimit: number;
  iacpEnabled: boolean;
  theme: "dark" | "light";

  setProviderConfig: (config: Partial<ProviderConfig>) => void;
  setMaxAgents: (count: number) => void;
  setConcurrencyLimit: (limit: number) => void;
  setIacpEnabled: (enabled: boolean) => void;
  setTheme: (theme: "dark" | "light") => void;
  toggleTheme: () => void;
}

export const PROVIDER_MODELS: Record<ProviderType, string[]> = {
  openai: ["gpt-4o", "gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"],
  anthropic: [
    "claude-sonnet-4-20250514",
    "claude-3-opus-20240229",
    "claude-3-haiku-20240307",
  ],
  ollama: ["llama3.1", "llama3", "mistral", "codellama"],
  glm: ["glm-5.1", "glm-4", "glm-4-flash", "glm-3-turbo"],
  mock: ["mock-model"],
};

export const PROVIDER_LABELS: Record<ProviderType, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  ollama: "Ollama",
  glm: "GLM",
  mock: "Mock (Testing)",
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      providerConfig: {
        provider: "openai",
        model: "gpt-4o",
        ollamaBaseUrl: "http://localhost:11434",
      },
      maxAgents: 7,
      concurrencyLimit: 3,
      iacpEnabled: true,
      theme: "dark",

      setProviderConfig: (config) =>
        set((state) => ({
          providerConfig: { ...state.providerConfig, ...config },
        })),
      setMaxAgents: (maxAgents) => set({ maxAgents }),
      setConcurrencyLimit: (concurrencyLimit) => set({ concurrencyLimit }),
      setIacpEnabled: (iacpEnabled) => set({ iacpEnabled }),
      setTheme: (theme) => {
        set({ theme });
        if (typeof document !== "undefined") {
          if (theme === "dark") {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
        }
      },
      toggleTheme: () =>
        set((state) => {
          const newTheme = state.theme === "dark" ? "light" : "dark";
          if (typeof document !== "undefined") {
            if (newTheme === "dark") {
              document.documentElement.classList.add("dark");
            } else {
              document.documentElement.classList.remove("dark");
            }
          }
          return { theme: newTheme };
        }),
    }),
    {
      name: "deep-thinking-settings",
    }
  )
);
