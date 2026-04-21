import { create } from "zustand";

export interface HistorySession {
  id: string;
  query: string;
  response?: string;
  status: "active" | "completed" | "error";
  tokenUsage: number;
  createdAt: string;
  updatedAt: string;
}

interface HistoryStore {
  sessions: HistorySession[];
  isLoading: boolean;
  searchQuery: string;
  currentPage: number;
  totalSessions: number;

  // Actions
  fetchSessions: (page?: number, search?: string) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  deleteSessions: (ids: string[]) => Promise<void>;
  setSearchQuery: (query: string) => void;

  // Helpers
  getSessionById: (id: string) => HistorySession | undefined;
}

export const useHistoryStore = create<HistoryStore>()((set, get) => ({
  sessions: [],
  isLoading: false,
  searchQuery: "",
  currentPage: 1,
  totalSessions: 0,

  fetchSessions: async (page = 1, search?: string) => {
    set({ isLoading: true });
    try {
      const searchQuery = search ?? get().searchQuery;
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });
      if (searchQuery) {
        params.set("search", searchQuery);
      }

      const res = await fetch(`/api/sessions?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      set({
        sessions: data.sessions as HistorySession[],
        totalSessions: data.total as number,
        currentPage: page,
        searchQuery,
      });
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  deleteSession: async (id: string) => {
    try {
      const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      set((state) => ({
        sessions: state.sessions.filter((s) => s.id !== id),
        totalSessions: Math.max(0, state.totalSessions - 1),
      }));
    } catch (error) {
      console.error("Failed to delete session:", error);
    }
  },

  deleteSessions: async (ids: string[]) => {
    if (ids.length === 0) return;
    try {
      const res = await fetch("/api/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const idSet = new Set(ids);
      set((state) => ({
        sessions: state.sessions.filter((s) => !idSet.has(s.id)),
        totalSessions: Math.max(0, state.totalSessions - ids.length),
      }));
    } catch (error) {
      console.error("Failed to delete sessions:", error);
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  getSessionById: (id: string) => {
    return get().sessions.find((s) => s.id === id);
  },
}));
