import { create } from "zustand";
import type { UIChatMessage } from "@/types";

interface ChatState {
  messages: UIChatMessage[];
  isLoading: boolean;
  currentSessionId?: string;

  addMessage: (message: UIChatMessage) => void;
  updateLastCouncilMessage: (content: string) => void;
  setLoading: (loading: boolean) => void;
  clearMessages: () => void;
  setCurrentSessionId: (id: string | undefined) => void;
  loadSession: (id: string) => Promise<void>;
  saveCurrentSession: () => Promise<void>;
}

export const useChatStore = create<ChatState>()((set, get) => ({
  messages: [],
  isLoading: false,
  currentSessionId: undefined,

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  updateLastCouncilMessage: (content) =>
    set((state) => {
      const messages = [...state.messages];
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "council") {
          messages[i] = { ...messages[i], content };
          break;
        }
      }
      return { messages };
    }),

  setLoading: (isLoading) => set({ isLoading }),

  clearMessages: () => set({ messages: [], currentSessionId: undefined }),

  setCurrentSessionId: (id) => set({ currentSessionId: id }),

  loadSession: async (id: string) => {
    try {
      const res = await fetch(`/api/sessions/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const session = await res.json();
      const messages: UIChatMessage[] = [];

      // Add the original user query
      messages.push({
        id: `user-${session.id}`,
        role: "user",
        content: session.query,
        timestamp: new Date(session.createdAt).getTime(),
      });

      // Add the council response if available
      if (session.response) {
        messages.push({
          id: `council-${session.id}`,
          role: "council",
          content: session.response,
          timestamp: new Date(session.updatedAt).getTime(),
        });
      }

      set({
        messages,
        currentSessionId: id,
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to load session:", error);
    }
  },

  saveCurrentSession: async () => {
    const { messages, currentSessionId } = get();

    const userMessage = messages.find((m) => m.role === "user");
    const councilMessage = [...messages].reverse().find((m) => m.role === "council");

    if (!userMessage) return;

    try {
      if (currentSessionId) {
        // Update existing session
        await fetch(`/api/sessions/${currentSessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            response: councilMessage?.content ?? undefined,
            status: councilMessage ? "completed" : "active",
          }),
        });
      } else {
        // Create new session
        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: userMessage.content,
          }),
        });

        if (res.ok) {
          const session = await res.json();
          set({ currentSessionId: session.id });

          // If we already have a response, update the session
          if (councilMessage?.content) {
            await fetch(`/api/sessions/${session.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                response: councilMessage.content,
                status: "completed",
              }),
            });
          }
        }
      }
    } catch (error) {
      // Best-effort persistence — don't break the app
      console.error("Failed to save session:", error);
    }
  },
}));
