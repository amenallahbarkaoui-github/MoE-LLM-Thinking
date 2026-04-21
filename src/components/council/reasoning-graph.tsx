"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitBranch,
  Check,
  AlertTriangle,
  HelpCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { VerificationStatus } from "@/types/council";

// ─── Types ────────────────────────────────────────────────────────

interface BranchData {
  branch: number;
  thought: string;
  confidence: number;
}

interface VerificationData {
  agentId: string;
  targetAgentId: string;
  claim: string;
  score: number;
  status: VerificationStatus;
  issues: string[];
  round: number;
}

interface AgentReasoningData {
  id: string;
  name: string;
  domain: string;
  branches: BranchData[];
  selectedBranch?: number;
  verifications: VerificationData[];
  overallConfidence: number;
}

interface ReasoningGraphProps {
  agents: AgentReasoningData[];
}

// ─── Helpers ──────────────────────────────────────────────────────

function confidenceColor(c: number): string {
  if (c > 0.7) return "bg-emerald-500";
  if (c > 0.4) return "bg-amber-500";
  return "bg-red-500";
}

function confidenceTextColor(c: number): string {
  if (c > 0.7) return "text-emerald-600 dark:text-emerald-400";
  if (c > 0.4) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function VerificationIcon({ status }: { status: VerificationStatus }) {
  switch (status) {
    case "verified":
      return <Check className="h-3.5 w-3.5 text-emerald-500" />;
    case "disputed":
      return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
    case "unverified":
      return <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

function ConfidenceBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={`h-1.5 w-full bg-muted rounded-full overflow-hidden ${className ?? ""}`}>
      <motion.div
        className={`h-full rounded-full ${confidenceColor(value)}`}
        initial={{ width: 0 }}
        animate={{ width: `${Math.round(value * 100)}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
    </div>
  );
}

// ─── Agent Tree Node ──────────────────────────────────────────────

function AgentNode({ agent }: { agent: AgentReasoningData }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="overflow-hidden">
      {/* Agent Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-accent/50 transition-colors text-left"
      >
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
          <GitBranch className="h-3.5 w-3.5" />
        </div>

        <span className="text-xs font-medium flex-1 truncate">{agent.name}</span>

        {agent.branches.length > 0 && (
          <Badge variant="secondary" className="text-[9px] h-4 shrink-0">
            {agent.branches.length} branch{agent.branches.length !== 1 ? "es" : ""}
          </Badge>
        )}

        <span className={`text-[10px] font-semibold tabular-nums shrink-0 ${confidenceTextColor(agent.overallConfidence)}`}>
          {Math.round(agent.overallConfidence * 100)}%
        </span>
      </button>

      {/* Confidence bar */}
      <ConfidenceBar value={agent.overallConfidence} className="mx-3 mb-2" />

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2">
              {/* Branches */}
              {agent.branches.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    Reasoning Branches
                  </p>
                  {agent.branches.map((branch) => {
                    const isSelected = branch.branch === agent.selectedBranch;
                    return (
                      <div
                        key={branch.branch}
                        className={`p-2 rounded-md border text-xs ${
                          isSelected
                            ? "border-primary/40 bg-primary/5"
                            : "border-border bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-foreground/80">
                            Branch {branch.branch}
                          </span>
                          {isSelected && (
                            <Badge className="text-[8px] h-3.5 bg-primary/10 text-primary border-primary/20">
                              Selected
                            </Badge>
                          )}
                          <span className={`ml-auto text-[10px] font-semibold tabular-nums ${confidenceTextColor(branch.confidence)}`}>
                            {Math.round(branch.confidence * 100)}%
                          </span>
                        </div>
                        <p className="text-muted-foreground line-clamp-3 leading-relaxed">
                          {branch.thought.substring(0, 300)}
                          {branch.thought.length > 300 ? "..." : ""}
                        </p>
                        <ConfidenceBar value={branch.confidence} className="mt-1.5" />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Verifications */}
              {agent.verifications.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    Verification Results
                  </p>
                  {agent.verifications.map((v, i) => (
                    <div
                      key={`${v.targetAgentId}-${v.round}-${i}`}
                      className="flex items-start gap-2 p-2 rounded-md border bg-muted/50"
                    >
                      <VerificationIcon status={v.status} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-medium capitalize">
                            {v.status}
                          </span>
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            (score: {v.score}/10)
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                          {v.claim}
                        </p>
                        {v.status === "disputed" && v.issues.length > 0 && (
                          <ul className="mt-1 space-y-0.5">
                            {v.issues.map((issue, idx) => (
                              <li
                                key={idx}
                                className="text-[9px] text-amber-600 dark:text-amber-400 flex items-start gap-1"
                              >
                                <span className="shrink-0 mt-0.5">•</span>
                                <span>{issue}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────

export function ReasoningGraph({ agents }: ReasoningGraphProps) {
  if (agents.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center">
          <GitBranch className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-xs text-muted-foreground">
            No reasoning data yet.
            <br />
            Branches appear during deep analysis.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-1 font-medium">
          Agent Reasoning Trees
        </p>
        {agents.map((agent) => (
          <AgentNode key={agent.id} agent={agent} />
        ))}
      </div>
    </ScrollArea>
  );
}
