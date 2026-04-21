"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { User, Brain, AlertTriangle, Copy, Check, Share2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { ConsensusView } from "@/components/council/consensus-view";
import { ExportModal } from "./export-modal";
import type { UIChatMessage } from "@/types";
import type { ConsensusResult } from "@/types/council";

// ─── Types ────────────────────────────────────────────────────────

type SynthesisPhase = "early" | "developing" | "complete";

interface ChatMessageProps {
  message: UIChatMessage;
  /** The original user query (for export context) */
  userQuery?: string;
  /** Current synthesis phase for in-progress messages */
  synthesisPhase?: SynthesisPhase;
  /** Consensus result to show at the bottom of assistant messages */
  consensus?: ConsensusResult | null;
  /** Number of agents activated (for export) */
  agentCount?: number;
}

// ─── Phase Label ──────────────────────────────────────────────────

const PHASE_LABELS: Record<SynthesisPhase, string> = {
  early: "Early Insights",
  developing: "Developing Analysis",
  complete: "Complete Analysis",
};

const PHASE_COLORS: Record<SynthesisPhase, string> = {
  early: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  developing: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  complete: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

function SynthesisPhaseLabel({ phase }: { phase: SynthesisPhase }) {
  return (
    <motion.div
      key={phase}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-2"
    >
      <Badge variant="secondary" className={`text-[10px] h-5 ${PHASE_COLORS[phase]}`}>
        {PHASE_LABELS[phase]}
      </Badge>
    </motion.div>
  );
}

// ─── Disagreement Banner ──────────────────────────────────────────

function DisagreementBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="mt-2 flex items-start gap-2 p-2 rounded-md bg-amber-500/5 border border-amber-500/20"
    >
      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
      <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
        Note: Experts had significant disagreements on some points. See details below.
      </p>
    </motion.div>
  );
}

// ─── Copy Button ──────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded-md hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      title={copied ? "Copied!" : "Copy message"}
      aria-label={copied ? "Copied to clipboard" : "Copy message to clipboard"}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
      )}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────

export function ChatMessage({
  message,
  userQuery,
  synthesisPhase,
  consensus,
  agentCount,
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const hasDisagreement = consensus && consensus.consensusScore < 0.5;
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <div className={`group flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="flex-shrink-0 mt-1">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Brain className="h-4 w-4 text-primary-foreground" />
          </div>
        </div>
      )}

      <div className="relative max-w-[80%]">
        {/* Action buttons — visible on hover */}
        {message.content && (
          <div
            className={`absolute -top-2 ${
              isUser ? "left-0" : "right-0"
            } flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-background border rounded-md shadow-sm px-0.5 py-0.5 z-10`}
          >
            <CopyButton text={message.content} />
            {!isUser && (
              <button
                onClick={() => setExportOpen(true)}
                className="p-1 rounded-md hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title="Export response"
                aria-label="Export council response"
              >
                <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        )}

        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-card border rounded-tl-sm"
          }`}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : message.content ? (
            <div>
              {/* Synthesis phase label */}
              {synthesisPhase && <SynthesisPhaseLabel phase={synthesisPhase} />}

              <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0.5 prose-pre:my-2 prose-pre:bg-muted prose-pre:border prose-code:text-foreground prose-a:text-primary prose-strong:text-foreground">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              </div>

              {/* Disagreement banner */}
              {hasDisagreement && <DisagreementBanner />}

              {/* Consensus summary (collapsible, compact mode) */}
              {consensus && (
                <ConsensusView consensus={consensus} compact />
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full bg-foreground/30 animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="h-2 w-2 rounded-full bg-foreground/30 animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="h-2 w-2 rounded-full bg-foreground/30 animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                Council is thinking...
              </span>
            </div>
          )}
        </div>
      </div>

      {isUser && (
        <div className="flex-shrink-0 mt-1">
          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      )}

      {/* Export modal for assistant messages */}
      {!isUser && message.content && (
        <ExportModal
          open={exportOpen}
          onOpenChange={setExportOpen}
          query={userQuery || ""}
          response={message.content}
          agentCount={agentCount}
          consensusScore={consensus?.consensusScore}
        />
      )}
    </div>
  );
}
