"use client";

import { useRef, useEffect, useState } from "react";
import { ChatMessage } from "./chat-message";
import { ClarificationDialog } from "./clarification-dialog";
import { Brain, MessageSquare, Lightbulb, Globe, AlertTriangle, Zap, Clock } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCouncilStore } from "@/stores/council-store";
import type { UIChatMessage } from "@/types";

interface ClarificationData {
  suggestions: string[];
  reasons: string[];
  complexity: string;
}

interface CacheHitData {
  query: string;
  cachedAt: number;
}

interface ChatAreaProps {
  messages: UIChatMessage[];
  onClarificationSelect?: (suggestion: string) => void;
}

// Global event listener registry to avoid race conditions
type SSEEventListener = (eventType: string, data: Record<string, unknown>) => void;
const sseEventListeners = new Set<SSEEventListener>();

function addSSEEventListener(listener: SSEEventListener) {
  sseEventListeners.add(listener);
}

function removeSSEEventListener(listener: SSEEventListener) {
  sseEventListeners.delete(listener);
}

// Call this once in ChatArea to set up the global dispatch
function setupSSEGlobalDispatcher() {
  const store = useCouncilStore.getState();
  const originalHandler = store.handleSSEEvent;
  const globalHandler = (eventType: string, data: Record<string, unknown>) => {
    // Notify all registered listeners first
    sseEventListeners.forEach(listener => {
      try {
        listener(eventType, data);
      } catch (err) {
        console.error('SSE event listener error:', err);
      }
    });
    // Then call the original handler
    originalHandler(eventType, data);
  };
  useCouncilStore.setState({ handleSSEEvent: globalHandler });
}

/** Find the most recent user message before a given index */
function findPrecedingUserQuery(messages: UIChatMessage[], index: number): string {
  for (let i = index - 1; i >= 0; i--) {
    if (messages[i].role === "user") return messages[i].content;
  }
  return "";
}

const SAMPLE_QUERIES = [
  {
    text: "How should I architect a SaaS platform?",
    icon: Globe,
  },
  {
    text: "What are the legal risks of AI in healthcare?",
    icon: Lightbulb,
  },
  {
    text: "How to build a successful startup?",
    icon: MessageSquare,
  },
  {
    text: "Explain quantum computing applications",
    icon: Brain,
  },
];

interface TokenUsageInfo {
  totalTokens: number;
  percentUsed: number;
  remaining: number;
  byAgent: Record<string, { promptTokens: number; completionTokens: number; totalTokens: number }>;
}

interface BudgetWarningInfo {
  warning: string;
  percentUsed: number;
}

function TokenUsageBar({ tokenUsage }: { tokenUsage: TokenUsageInfo }) {
  const percent = Math.min(tokenUsage.percentUsed, 100);
  return (
    <div className="max-w-3xl mx-auto mt-3 p-3 rounded-lg border bg-card">
      <div className="flex items-center gap-2 mb-1.5">
        <Zap className="h-3 w-3 text-muted-foreground" />
        <span className="text-[11px] font-medium text-muted-foreground">
          Tokens used: {tokenUsage.totalTokens.toLocaleString()}
        </span>
        <span className="text-[10px] text-muted-foreground/70">
          ({percent.toFixed(1)}%)
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            percent > 80 ? "bg-amber-500" : "bg-primary"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {tokenUsage.remaining > 0 && (
        <p className="text-[10px] text-muted-foreground/60 mt-1">
          {tokenUsage.remaining.toLocaleString()} tokens remaining
        </p>
      )}
    </div>
  );
}

function BudgetWarningBanner({ warning }: { warning: BudgetWarningInfo }) {
  return (
    <div className="max-w-3xl mx-auto mt-2 px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/5">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
        <p className="text-[11px] text-amber-600 dark:text-amber-400">
          {warning.warning}
        </p>
      </div>
    </div>
  );
}

function CompletionSummary() {
  const { status, totalTime, agentsActivated, agentsSucceeded } = useCouncilStore();
  const [tokenUsage, setTokenUsage] = useState<TokenUsageInfo | null>(null);
  const [budgetWarning, setBudgetWarning] = useState<BudgetWarningInfo | null>(null);

  // Subscribe to council store's SSE events using global listener
  useEffect(() => {
    const listener = (eventType: string, data: Record<string, unknown>) => {
      if (eventType === "council:budget_warning") {
        setBudgetWarning({
          warning: data.warning as string,
          percentUsed: data.percentUsed as number,
        });
      }
      if (eventType === "council:complete" && data.tokenUsage) {
        setTokenUsage(data.tokenUsage as TokenUsageInfo);
      }
      if (eventType === "council:start") {
        setTokenUsage(null);
        setBudgetWarning(null);
      }
    };
    addSSEEventListener(listener);
    return () => {
      removeSSEEventListener(listener);
    };
  }, []);

  if (status !== "complete") {
    // Show budget warning even during processing
    if (budgetWarning) {
      return <BudgetWarningBanner warning={budgetWarning} />;
    }
    return null;
  }

  return (
    <>
      {budgetWarning && <BudgetWarningBanner warning={budgetWarning} />}
      {tokenUsage ? (
        <TokenUsageBar tokenUsage={tokenUsage} />
      ) : (
        <div className="max-w-3xl mx-auto mt-3 px-3 py-2 rounded-lg border bg-card">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <Zap className="h-3 w-3" />
            <span>{agentsActivated} agents activated</span>
            <span className="text-muted-foreground/40">·</span>
            <span>{agentsSucceeded} succeeded</span>
            {totalTime && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span>{(totalTime / 1000).toFixed(1)}s</span>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export function ChatArea({ messages, onClarificationSelect }: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const councilState = useCouncilStore();
  const [clarification, setClarification] = useState<ClarificationData | null>(null);
  const [cacheHit, setCacheHit] = useState<CacheHitData | null>(null);

  // Set up global SSE dispatcher once
  useEffect(() => {
    setupSSEGlobalDispatcher();
  }, []);

  // Listen for clarification_needed and cache_hit SSE events
  useEffect(() => {
    const timeoutIds: number[] = [];
    const listener = (eventType: string, data: Record<string, unknown>) => {
      if (eventType === "council:clarification_needed") {
        setClarification({
          suggestions: data.suggestions as string[],
          reasons: data.reasons as string[],
          complexity: data.complexity as string,
        });
      }
      if (eventType === "council:cache_hit") {
        setCacheHit({
          query: data.query as string,
          cachedAt: data.cachedAt as number,
        });
        // Auto-dismiss cache banner after 5s
        const timeoutId = window.setTimeout(() => setCacheHit(null), 5000);
        timeoutIds.push(timeoutId);
      }
      if (eventType === "council:start") {
        setClarification(null);
        setCacheHit(null);
        timeoutIds.forEach(id => clearTimeout(id));
        timeoutIds.length = 0;
      }
    };
    addSSEEventListener(listener);
    return () => {
      removeSSEEventListener(listener);
      timeoutIds.forEach(id => clearTimeout(id));
    };
  }, []);

  const handleSelectSuggestion = (suggestion: string) => {
    setClarification(null);
    onClarificationSelect?.(suggestion);
  };

  const handleDismissClarification = () => {
    setClarification(null);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, clarification, cacheHit]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-lg">
          {/* Icon */}
          <div className="mx-auto mb-6 h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Brain className="h-8 w-8 text-primary" />
          </div>

          <h2 className="text-xl font-semibold mb-2">
            Deep Thinking AI Council
          </h2>
          <p className="text-muted-foreground text-sm mb-8 leading-relaxed max-w-md mx-auto">
            Ask any question and a council of up to{" "}
            <span className="font-medium text-foreground">70 specialized AI experts</span>{" "}
            will analyze it from multiple perspectives, discuss among themselves,
            and deliver a comprehensive answer.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SAMPLE_QUERIES.map((q) => (
              <button
                key={q.text}
                className="text-left p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
                onClick={() => {
                  const input = document.querySelector("textarea");
                  if (input && typeof window !== "undefined") {
                    const nativeInputValueSetter =
                      Object.getOwnPropertyDescriptor(
                        window.HTMLTextAreaElement.prototype,
                        "value"
                      )?.set;
                    nativeInputValueSetter?.call(input, q.text);
                    input.dispatchEvent(
                      new Event("input", { bubbles: true })
                    );
                    input.focus();
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <q.icon className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground leading-relaxed">
                    {q.text}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((msg, idx) => (
        <ChatMessage
          key={msg.id}
          message={msg}
          userQuery={
            msg.role !== "user"
              ? findPrecedingUserQuery(messages, idx)
              : undefined
          }
          agentCount={
            msg.role !== "user" ? councilState.agentsActivated : undefined
          }
          synthesisPhase={
            msg.role === "council" && councilState.status === "synthesizing"
              ? "developing"
              : msg.role === "council" && councilState.status === "complete"
              ? "complete"
              : undefined
          }
          consensus={
            msg.role === "council" && councilState.status === "complete"
              ? (msg.session?.consensus ?? null)
              : null
          }
        />
      ))}

      {/* Clarification dialog — inline in chat flow */}
      <AnimatePresence>
        {clarification && (
          <ClarificationDialog
            suggestions={clarification.suggestions}
            reasons={clarification.reasons}
            complexity={clarification.complexity}
            onSelectSuggestion={handleSelectSuggestion}
            onDismiss={handleDismissClarification}
          />
        )}
      </AnimatePresence>

      {/* Cache hit banner — subtle, non-intrusive */}
      <AnimatePresence>
        {cacheHit && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="max-w-3xl mx-auto"
          >
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50">
              <Clock className="h-3 w-3 text-muted-foreground/60" />
              <span className="text-[11px] text-muted-foreground/60">
                Retrieved from cache
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CompletionSummary />
      <div ref={bottomRef} />
    </div>
  );
}
