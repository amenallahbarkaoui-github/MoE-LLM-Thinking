"use client";

import { Navbar } from "@/components/layout/navbar";
import { ChatArea } from "@/components/chat/chat-area";
import { ChatInput } from "@/components/chat/chat-input";
import { AgentProgressPanel } from "@/components/agents/agent-progress-panel";
import { HistoryPanel } from "@/components/chat/history-panel";
import { ReasoningGraph } from "@/components/council/reasoning-graph";
import { ConsensusView } from "@/components/council/consensus-view";
import { useChat } from "@/hooks/use-chat";
import { useCouncilStore } from "@/stores/council-store";
import { useKeyboardShortcuts } from "@/lib/keyboard-shortcuts";
import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PanelRightOpen,
  PanelRightClose,
  PanelLeftOpen,
  PanelLeftClose,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function ChatPage() {
  const {
    messages,
    isLoading,
    sendMessage,
    stopGeneration,
    clearMessages,
    loadSession,
    startNewSession,
  } = useChat();
  const [showAgentPanel, setShowAgentPanel] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [rightTab, setRightTab] = useState<string>("agents");

  // High-contrast mode — persisted in localStorage
  const [highContrast, setHighContrast] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("high-contrast");
      if (saved === "true") {
        document.documentElement.classList.add("high-contrast");
        return true;
      }
    }
    return false;
  });

  const toggleHighContrast = useCallback(() => {
    setHighContrast((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("high-contrast");
      } else {
        document.documentElement.classList.remove("high-contrast");
      }
      localStorage.setItem("high-contrast", String(next));
      return next;
    });
  }, []);

  const handleClarificationSelect = useCallback((suggestion: string) => {
    // Fill the textarea via DOM (same pattern as sample queries)
    const textarea = document.querySelector("textarea");
    if (textarea) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        "value"
      )?.set;
      nativeInputValueSetter?.call(textarea, suggestion);
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.focus();
    }
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts(
    useMemo(
      () => [
        {
          key: "k",
          ctrl: true,
          handler: () => setShowHistory((prev) => !prev),
          description: "Toggle history panel",
        },
        {
          key: "Escape",
          handler: () => {
            setShowHistory(false);
            setShowAgentPanel(false);
          },
          description: "Close open panels",
        },
      ],
      []
    )
  );

  const councilState = useCouncilStore();

  // Build reasoning graph data from council agents
  const reasoningAgents = useMemo(() => {
    return Object.values(councilState.agents).map((agent) => {
      const ext = agent as unknown as Record<string, unknown>;
      return {
        id: agent.id,
        name: agent.name,
        domain: agent.domain,
        branches: (ext.branches as Array<{ branch: number; thought: string; confidence: number }>) ?? [],
        selectedBranch: ext.selectedBranch as number | undefined,
        verifications: (ext.verifications as Array<{
          agentId: string;
          targetAgentId: string;
          claim: string;
          score: number;
          status: "verified" | "disputed" | "unverified";
          issues: string[];
          round: number;
        }>) ?? [],
        overallConfidence:
          typeof ext.selectionConfidence === "number"
            ? ext.selectionConfidence
            : agent.confidence === "HIGH"
            ? 0.85
            : agent.confidence === "MEDIUM"
            ? 0.6
            : agent.confidence === "LOW"
            ? 0.3
            : 0.5,
      };
    });
  }, [councilState.agents]);

  // Get consensus from the session if available
  const consensus = useMemo(() => {
    const lastMsg = messages[messages.length - 1];
    return lastMsg?.session?.consensus ?? null;
  }, [messages]);

  const handleLoadSession = useCallback(
    (id: string) => {
      loadSession(id);
      // Auto-close history on mobile
      if (typeof window !== "undefined" && window.innerWidth < 768) {
        setShowHistory(false);
      }
    },
    [loadSession]
  );

  const handleNewSession = useCallback(() => {
    startNewSession();
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setShowHistory(false);
    }
  }, [startNewSession]);

  return (
    <div className="h-screen flex flex-col">
      <Navbar
        onClear={clearMessages}
        highContrast={highContrast}
        onToggleHighContrast={toggleHighContrast}
      >
        {/* History toggle in navbar area */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowHistory(!showHistory)}
          title="Toggle history (Ctrl+K)"
          className="text-muted-foreground"
        >
          {showHistory ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </Button>
      </Navbar>

      <div className="flex-1 flex overflow-hidden relative">
        {/* History Panel — Desktop: pushes content; Mobile: overlay */}
        {/* Desktop sidebar */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="shrink-0 overflow-hidden hidden md:block"
            >
              <div className="w-[280px] h-full">
                <HistoryPanel
                  onLoadSession={handleLoadSession}
                  onNewSession={handleNewSession}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile overlay */}
        <AnimatePresence>
          {showHistory && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 md:hidden"
                onClick={() => setShowHistory(false)}
              />
              <motion.div
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="fixed left-0 top-14 bottom-0 w-[280px] z-40 md:hidden"
              >
                <div className="h-full relative">
                  <HistoryPanel
                    onLoadSession={handleLoadSession}
                    onNewSession={handleNewSession}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={() => setShowHistory(false)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <ChatArea
            messages={messages}
            onClarificationSelect={handleClarificationSelect}
          />
          <ChatInput
            onSend={sendMessage}
            onStop={stopGeneration}
            isLoading={isLoading}
          />

          {/* Keyboard shortcut hints */}
          <div className="py-1 text-center">
            <p className="text-[10px] text-muted-foreground/40 select-none">
              <kbd className="font-mono">Ctrl+K</kbd> History
              <span className="mx-1.5">&middot;</span>
              <kbd className="font-mono">Esc</kbd> Close
              <span className="mx-1.5">&middot;</span>
              <kbd className="font-mono">Enter</kbd> Send
            </p>
          </div>
        </div>

        {/* Agent Panel Toggle (mobile) */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 top-2 z-10 h-8 w-8 rounded-l-md rounded-r-none border border-r-0 bg-background md:hidden"
          onClick={() => setShowAgentPanel(!showAgentPanel)}
          aria-label={showAgentPanel ? "Close agent panel" : "Open agent panel"}
        >
          {showAgentPanel ? (
            <PanelRightClose className="h-4 w-4" />
          ) : (
            <PanelRightOpen className="h-4 w-4" />
          )}
        </Button>

        {/* Mobile agent panel overlay */}
        <AnimatePresence>
          {showAgentPanel && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 md:hidden"
                onClick={() => setShowAgentPanel(false)}
              />
              <motion.div
                initial={{ x: 320 }}
                animate={{ x: 0 }}
                exit={{ x: 320 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="fixed right-0 top-14 bottom-0 w-80 z-40 bg-background border-l md:hidden"
              >
                <div className="h-full relative flex flex-col">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 left-2 h-6 w-6 z-10"
                    onClick={() => setShowAgentPanel(false)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <Tabs value={rightTab} onValueChange={setRightTab} className="flex flex-col h-full">
                    <div className="px-2 pt-2">
                      <TabsList className="w-full h-8">
                        <TabsTrigger value="agents" className="text-[11px] flex-1 h-6">
                          Agents
                        </TabsTrigger>
                        <TabsTrigger value="reasoning" className="text-[11px] flex-1 h-6">
                          Reasoning
                        </TabsTrigger>
                        <TabsTrigger value="consensus" className="text-[11px] flex-1 h-6">
                          Consensus
                        </TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent value="agents" className="flex-1 mt-0 overflow-hidden">
                      <AgentProgressPanel />
                    </TabsContent>
                    <TabsContent value="reasoning" className="flex-1 mt-0 overflow-hidden">
                      <ReasoningGraph agents={reasoningAgents} />
                    </TabsContent>
                    <TabsContent value="consensus" className="flex-1 mt-0 overflow-hidden">
                      <ConsensusView consensus={consensus} />
                    </TabsContent>
                  </Tabs>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Right Panel — Desktop only: Tabbed: Agents | Reasoning | Consensus */}
        <div className="w-80 shrink-0 hidden md:flex md:flex-col">
          <Tabs value={rightTab} onValueChange={setRightTab} className="flex flex-col h-full">
            <div className="px-2 pt-2 border-l bg-background">
              <TabsList className="w-full h-8">
                <TabsTrigger value="agents" className="text-[11px] flex-1 h-6">
                  Agents
                </TabsTrigger>
                <TabsTrigger value="reasoning" className="text-[11px] flex-1 h-6">
                  Reasoning
                </TabsTrigger>
                <TabsTrigger value="consensus" className="text-[11px] flex-1 h-6">
                  Consensus
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="agents" className="flex-1 mt-0 overflow-hidden">
              <AgentProgressPanel />
            </TabsContent>
            <TabsContent value="reasoning" className="flex-1 mt-0 overflow-hidden border-l bg-background">
              <ReasoningGraph agents={reasoningAgents} />
            </TabsContent>
            <TabsContent value="consensus" className="flex-1 mt-0 overflow-hidden border-l bg-background">
              <ConsensusView consensus={consensus} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
