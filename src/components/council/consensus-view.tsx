"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Scale,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ConsensusResult } from "@/types/council";

// ─── Types ────────────────────────────────────────────────────────

interface ConsensusViewProps {
  consensus: ConsensusResult | null;
  /** Compact inline mode for embedding in chat messages */
  compact?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score > 0.7) return "text-emerald-600 dark:text-emerald-400";
  if (score > 0.4) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function scoreBgColor(score: number): string {
  if (score > 0.7) return "bg-emerald-500";
  if (score > 0.4) return "bg-amber-500";
  return "bg-red-500";
}

function scoreLabel(score: number): string {
  if (score > 0.7) return "High Consensus";
  if (score > 0.4) return "Moderate Consensus";
  return "Low Consensus";
}

// ─── Score Display ────────────────────────────────────────────────

function ConsensusScore({ score }: { score: number }) {
  const pct = Math.round(score * 100);

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <div className={`text-2xl font-bold tabular-nums ${scoreColor(score)}`}>
          {pct}%
        </div>
      </div>
      <div className="flex-1">
        <p className={`text-xs font-medium ${scoreColor(score)}`}>
          {scoreLabel(score)}
        </p>
        <div className="mt-1 h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${scoreBgColor(score)}`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Collapsible Section ──────────────────────────────────────────

function CollapsibleSection({
  title,
  icon,
  count,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (count === 0) return null;

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left py-1 hover:bg-accent/30 rounded px-1 transition-colors"
      >
        {open ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        )}
        {icon}
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex-1">
          {title}
        </span>
        <Badge variant="secondary" className="text-[9px] h-4">
          {count}
        </Badge>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-1 space-y-1.5 pl-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Compact Inline View (for chat messages) ──────────────────────

function CompactConsensusView({ consensus }: { consensus: ConsensusResult }) {
  const [expanded, setExpanded] = useState(false);
  const pct = Math.round(consensus.consensusScore * 100);

  return (
    <div className="mt-3 border-t pt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left hover:bg-accent/30 rounded px-1 py-0.5 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        )}
        <Scale className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          Council Consensus
        </span>
        <Badge
          variant="secondary"
          className={`text-[9px] h-4 ml-auto ${scoreColor(consensus.consensusScore)}`}
        >
          {pct}%
        </Badge>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-2 pl-1">
              {consensus.consensusPoints.length > 0 && (
                <div className="space-y-1">
                  {consensus.consensusPoints.map((point, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[11px]">
                      <Check className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{point}</span>
                    </div>
                  ))}
                </div>
              )}
              {consensus.disagreementPoints.length > 0 && (
                <div className="space-y-1">
                  {consensus.disagreementPoints.map((point, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[11px]">
                      <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{point}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Full Panel View ──────────────────────────────────────────────

function FullConsensusView({ consensus }: { consensus: ConsensusResult }) {
  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        {/* Score */}
        <ConsensusScore score={consensus.consensusScore} />

        {/* Consensus Points */}
        <CollapsibleSection
          title="Consensus Points"
          icon={<Check className="h-3 w-3 text-emerald-500" />}
          count={consensus.consensusPoints.length}
        >
          {consensus.consensusPoints.map((point, i) => (
            <Card key={i} className="p-2.5">
              <div className="flex items-start gap-2">
                <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-xs text-foreground/80 leading-relaxed">{point}</p>
              </div>
            </Card>
          ))}
        </CollapsibleSection>

        {/* Disagreement Points */}
        <CollapsibleSection
          title="Disagreement Points"
          icon={<AlertTriangle className="h-3 w-3 text-amber-500" />}
          count={consensus.disagreementPoints.length}
          defaultOpen={consensus.consensusScore < 0.5}
        >
          {consensus.disagreementPoints.map((point, i) => (
            <Card key={i} className="p-2.5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-foreground/80 leading-relaxed">{point}</p>
              </div>
            </Card>
          ))}
        </CollapsibleSection>
      </div>
    </ScrollArea>
  );
}

// ─── Main Component ───────────────────────────────────────────────

export function ConsensusView({ consensus, compact = false }: ConsensusViewProps) {
  if (!consensus) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center">
          <Scale className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-xs text-muted-foreground">
            No consensus data yet.
            <br />
            Results appear after synthesis.
          </p>
        </div>
      </div>
    );
  }

  if (compact) {
    return <CompactConsensusView consensus={consensus} />;
  }

  return <FullConsensusView consensus={consensus} />;
}
