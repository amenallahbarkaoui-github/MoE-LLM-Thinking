"use client";

import { useCallback, useRef } from "react";
import { useCouncilStore } from "@/stores/council-store";
import { useChatStore } from "@/stores/chat-store";
import { useSettingsStore } from "@/stores/settings-store";

export function useChat() {
  const abortRef = useRef<AbortController | null>(null);
  const {
    messages,
    isLoading,
    addMessage,
    setLoading,
    clearMessages,
    loadSession: loadSessionFromStore,
    saveCurrentSession,
  } = useChatStore();
  const settings = useSettingsStore();

  const sendMessage = useCallback(
    async (query: string) => {
      if (!query.trim() || isLoading) return;

      // Add user message
      addMessage({
        id: `user-${Date.now()}`,
        role: "user",
        content: query,
        timestamp: Date.now(),
      });

      // Add placeholder council message
      addMessage({
        id: `council-${Date.now()}`,
        role: "council",
        content: "",
        timestamp: Date.now(),
      });

      setLoading(true);
      useCouncilStore.getState().reset();

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            provider: settings.providerConfig.provider,
            model: settings.providerConfig.model,
            ollamaBaseUrl: settings.providerConfig.ollamaBaseUrl,
            maxAgents: settings.maxAgents,
            concurrencyLimit: settings.concurrencyLimit,
            iacpEnabled: settings.iacpEnabled,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          let currentEvent = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith("data: ") && currentEvent) {
              try {
                const data = JSON.parse(line.slice(6));
                // Use getState() to always get the current (potentially wrapped) handler
                useCouncilStore.getState().handleSSEEvent(currentEvent, data);

                if (currentEvent === "council:complete" && data.response) {
                  useChatStore
                    .getState()
                    .updateLastCouncilMessage(data.response);

                  // Auto-save session on completion (fire and forget)
                  saveCurrentSession().catch(() => {});
                }
                if (currentEvent === "council:error" && data.error) {
                  useChatStore
                    .getState()
                    .updateLastCouncilMessage(
                      `**Error:** ${data.error}`
                    );
                }
              } catch {
                // Skip malformed data
              }
              currentEvent = "";
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          const errorMsg =
            err instanceof Error ? err.message : "Unknown error";
          useChatStore
            .getState()
            .updateLastCouncilMessage(`**Error:** ${errorMsg}`);
          useCouncilStore.getState().handleSSEEvent("council:error", { error: errorMsg });
        }
      } finally {
        setLoading(false);
        abortRef.current = null;
      }
    },
    [isLoading, addMessage, setLoading, settings, saveCurrentSession]
  );

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
  }, [setLoading]);

  const loadSession = useCallback(
    async (id: string) => {
      await loadSessionFromStore(id);
      useCouncilStore.getState().reset();
    },
    [loadSessionFromStore]
  );

  const startNewSession = useCallback(() => {
    clearMessages();
    useCouncilStore.getState().reset();
  }, [clearMessages]);

  return {
    messages,
    isLoading,
    sendMessage,
    stopGeneration,
    clearMessages,
    loadSession,
    startNewSession,
  };
}
