"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Trash2,
  Clock,
  MessageSquare,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useHistoryStore, type HistorySession } from "@/stores/history-store";

interface HistoryPanelProps {
  onLoadSession: (id: string) => void;
  onNewSession: () => void;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function StatusBadge({ status }: { status: HistorySession["status"] }) {
  const variants: Record<
    string,
    { label: string; className: string }
  > = {
    completed: {
      label: "Completed",
      className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    active: {
      label: "Active",
      className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    },
    error: {
      label: "Error",
      className: "bg-destructive/10 text-destructive border-destructive/20",
    },
  };

  const v = variants[status] ?? variants.completed;
  return (
    <Badge
      variant="outline"
      className={`text-[9px] h-4 px-1.5 font-medium ${v.className}`}
    >
      {v.label}
    </Badge>
  );
}

function SessionSkeleton() {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="p-3 rounded-lg border animate-pulse">
          <div className="h-3 bg-muted rounded w-4/5 mb-2" />
          <div className="flex items-center gap-2">
            <div className="h-3 bg-muted rounded w-16" />
            <div className="h-4 bg-muted rounded w-14" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function HistoryPanel({ onLoadSession, onNewSession }: HistoryPanelProps) {
  const {
    sessions,
    isLoading,
    searchQuery,
    currentPage,
    totalSessions,
    fetchSessions,
    deleteSession,
    setSearchQuery,
  } = useHistoryStore();

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Fetch sessions on mount
  useEffect(() => {
    fetchSessions(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch);
      fetchSessions(1, localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteSession(id);
      setConfirmDeleteId(null);
    },
    [deleteSession]
  );

  const hasMore = sessions.length < totalSessions;

  const handleLoadMore = useCallback(() => {
    fetchSessions(currentPage + 1);
  }, [fetchSessions, currentPage]);

  return (
    <div className="h-full flex flex-col bg-background border-r">
      {/* Header */}
      <div className="p-3 border-b space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">History</h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={onNewSession}
          >
            <Plus className="h-3 w-3" />
            New Chat
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search sessions..."
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Session list */}
      <ScrollArea className="flex-1">
        {isLoading && sessions.length === 0 ? (
          <SessionSkeleton />
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center mb-3">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              No sessions yet.
              <br />
              Start a conversation!
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            <AnimatePresence initial={false}>
              {sessions.map((session) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onLoadSession(session.id)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onLoadSession(session.id); }}
                    className="w-full text-left p-2.5 rounded-lg border bg-card hover:bg-accent/50 transition-colors group relative cursor-pointer"
                  >
                    <p className="text-xs text-foreground/90 line-clamp-2 leading-relaxed pr-6">
                      {session.query.length > 60
                        ? session.query.slice(0, 60) + "..."
                        : session.query}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-muted-foreground">
                        {formatRelativeTime(session.createdAt)}
                      </span>
                      <StatusBadge status={session.status} />
                    </div>

                    {/* Delete button */}
                    {confirmDeleteId === session.id ? (
                      <div
                        className="absolute right-1.5 top-1.5 flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-5 w-5"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(session.id);
                          }}
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-[9px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(null);
                          }}
                        >
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1.5 top-1.5 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(session.id);
                        }}
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Load more */}
            {hasMore && (
              <>
                <Separator className="my-2" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-7 text-xs text-muted-foreground gap-1"
                  onClick={handleLoadMore}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  Load more
                </Button>
              </>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Footer count */}
      {totalSessions > 0 && (
        <div className="p-2 border-t">
          <p className="text-[10px] text-muted-foreground text-center">
            {totalSessions} session{totalSessions !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}
