"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  ChevronRight,
  ChevronDown,
  Users,
  Activity,
  BrainCircuit,
  Star,
  GitBranch,
  Check,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  Search,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCouncilStore } from "@/stores/council-store";
import { useState, useMemo } from "react";
import type { IACPMessage, IACPPriority } from "@/types";
import type { VerificationStatus } from "@/types/council";

/** Extended agent info with Wave 3 fields */
interface AgentInfoExtended {
  id: string;
  name: string;
  domain: string;
  role: string;
  status: string;
  thought: string | null;
  confidence: string | null;
  processingTime: number | null;
  batchIndex: number;
  error: string | null;
  selectionConfidence?: number;
  performanceScore?: number;
  verificationStatus?: VerificationStatus;
  branchCount?: number;
  selectedBranch?: number;
  branches?: Array<{ branch: number; thought: string; confidence: number }>;
}

const DOMAIN_COLORS: Record<string, string> = {
  technology: "#6366f1",
  business: "#f59e0b",
  law: "#8b5cf6",
  science: "#0ea5e9",
  creativity: "#ec4899",
  education: "#10b981",
  philosophy: "#eab308",
  communication: "#3b82f6",
  psychology: "#f472b6",
  economics: "#06b6d4",
  cross: "#64748b",
};

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "thinking":
    case "discussing":
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />;
    case "complete":
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
    case "error":
    case "timeout":
      return <XCircle className="h-3.5 w-3.5 text-destructive" />;
    case "waiting":
      return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
    default:
      return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

function PhaseIndicator() {
  const { status } = useCouncilStore();

  const phases = [
    { key: "analyzing", label: "Analyze" },
    { key: "selecting", label: "Select" },
    { key: "thinking", label: "Think" },
    { key: "discussing", label: "Discuss" },
    { key: "verifying", label: "Verify" },
    { key: "synthesizing", label: "Synthesize" },
    { key: "complete", label: "Done" },
  ];

  const currentIndex = phases.findIndex((p) => p.key === status);

  if (status === "idle") return null;

  return (
    <div className="px-3 py-2 border-b">
      <div className="flex items-center gap-1 text-[10px]">
        {phases.map((phase, i) => (
          <div key={phase.key} className="flex items-center gap-1">
            <span
              className={`transition-colors duration-300 ${
                i < currentIndex
                  ? "text-emerald-500 font-medium"
                  : i === currentIndex
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground/40"
              }`}
            >
              {phase.label}
            </span>
            {i < phases.length - 1 && (
              <ChevronRight className="h-2.5 w-2.5 text-muted-foreground/30" />
            )}
          </div>
        ))}
      </div>
      {/* Progress bar */}
      <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: "0%" }}
          animate={{
            width: `${Math.max(((currentIndex + 1) / phases.length) * 100, 5)}%`,
          }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function PriorityDot({ priority }: { priority?: IACPPriority }) {
  if (!priority || priority === "normal") return null;
  if (priority === "urgent") {
    return <span className="inline-block h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />;
  }
  return <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />;
}

function IACPThreadedMessages({ messages }: { messages: IACPMessage[] }) {
  const threads = useMemo(() => {
    const threadMap = new Map<string, IACPMessage[]>();
    const standalone: IACPMessage[] = [];

    for (const msg of messages) {
      const tid = msg.threadId;
      if (tid) {
        const existing = threadMap.get(tid) || [];
        existing.push(msg);
        threadMap.set(tid, existing);
      } else {
        standalone.push(msg);
      }
    }

    return { threadMap, standalone };
  }, [messages]);

  const renderMessage = (msg: IACPMessage, indented = false) => (
    <div
      key={msg.id}
      className={`p-2 rounded-md bg-muted border ${indented ? "ml-3 border-l-2 border-l-muted-foreground/20" : ""}`}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <PriorityDot priority={msg.priority} />
        <span className="text-[10px] font-medium text-foreground">
          {msg.fromAgentName}
        </span>
        <Badge variant="secondary" className="text-[8px] h-3.5">
          {msg.type}
        </Badge>
      </div>
      <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
        {msg.content}
      </p>
    </div>
  );

  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 mb-1 font-medium flex items-center gap-1">
        <MessageSquare className="h-3 w-3" />
        IACP Messages
      </p>
      <div className="mx-2 space-y-1">
        {/* Threaded messages */}
        {Array.from(threads.threadMap.entries()).map(([threadId, msgs]) => {
          const root = msgs[0];
          const replies = msgs.slice(1);
          return (
            <div key={threadId} className="space-y-0.5">
              {renderMessage(root)}
              {replies.map((r) => renderMessage(r, true))}
            </div>
          );
        })}
        {/* Standalone messages */}
        {threads.standalone.slice(-5).map((msg) => renderMessage(msg))}
      </div>
    </div>
  );
}

// ─── Verification mini-icon ───────────────────────────────────────

function VerificationMiniIcon({ status }: { status: VerificationStatus }) {
  switch (status) {
    case "verified":
      return <Check className="h-3 w-3 text-emerald-500" />;
    case "disputed":
      return <AlertTriangle className="h-3 w-3 text-amber-500" />;
    case "unverified":
      return <HelpCircle className="h-3 w-3 text-muted-foreground/50" />;
  }
}

// ─── Confidence bar (inline) ─────────────────────────────────────

function MiniConfidenceBar({ value }: { value: number }) {
  const color =
    value > 0.7 ? "bg-emerald-500" : value > 0.4 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="h-1 w-10 bg-muted rounded-full overflow-hidden shrink-0">
      <div
        className={`h-full rounded-full ${color} transition-all duration-500`}
        style={{ width: `${Math.round(value * 100)}%` }}
      />
    </div>
  );
}

// ─── Performance badge ───────────────────────────────────────────

function PerformanceBadge({ score }: { score?: number }) {
  if (score === undefined) {
    return (
      <Badge variant="secondary" className="text-[8px] h-3.5 text-muted-foreground">
        <Sparkles className="h-2 w-2 mr-0.5" />
        New
      </Badge>
    );
  }
  if (score > 0.8) {
    return (
      <Badge variant="secondary" className="text-[8px] h-3.5 text-amber-600 dark:text-amber-400 bg-amber-500/10">
        <Star className="h-2 w-2 mr-0.5" />
        Top
      </Badge>
    );
  }
  return null;
}

// ─── Branches preview (expandable inside agent) ─────────────────

function BranchesPreview({
  branches,
  selectedBranch,
}: {
  branches: Array<{ branch: number; thought: string; confidence: number }>;
  selectedBranch?: number;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? branches : branches.slice(0, 2);

  return (
    <div className="mt-2 space-y-1">
      <button
        onClick={() => setShowAll(!showAll)}
        className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <GitBranch className="h-2.5 w-2.5" />
        {showAll ? "Hide" : "Show"} branches
        {showAll ? (
          <ChevronDown className="h-2.5 w-2.5" />
        ) : (
          <ChevronRight className="h-2.5 w-2.5" />
        )}
      </button>
      <AnimatePresence>
        {showAll && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-1 overflow-hidden"
          >
            {visible.map((b) => {
              const isSelected = b.branch === selectedBranch;
              const barColor =
                b.confidence > 0.7
                  ? "bg-emerald-500"
                  : b.confidence > 0.4
                  ? "bg-amber-500"
                  : "bg-red-500";
              return (
                <div
                  key={b.branch}
                  className={`p-1.5 rounded border text-[10px] ${
                    isSelected ? "border-primary/40 bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-medium">B{b.branch}</span>
                    {isSelected && (
                      <span className="text-[8px] text-primary font-semibold">
                        Selected
                      </span>
                    )}
                    <span className="ml-auto tabular-nums text-muted-foreground">
                      {Math.round(b.confidence * 100)}%
                    </span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor}`}
                      style={{ width: `${Math.round(b.confidence * 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-muted-foreground line-clamp-2">
                    {b.thought.substring(0, 150)}
                    {b.thought.length > 150 ? "..." : ""}
                  </p>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const COLLAPSED_LIMIT = 8;
const COLLAPSE_THRESHOLD = 15;

export function AgentProgressPanel() {
  const { agents, iacpMessages, status, agentsActivated, agentsSucceeded } =
    useCouncilStore();
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const agentList = Object.values(agents);

  // Filter agents by search query
  const filteredAgents = useMemo(() => {
    if (!searchQuery.trim()) return agentList;
    const q = searchQuery.toLowerCase();
    return agentList.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.domain.toLowerCase().includes(q)
    );
  }, [agentList, searchQuery]);

  // Apply show more/less
  const shouldCollapse = filteredAgents.length > COLLAPSE_THRESHOLD && !searchQuery;
  const displayedAgents = shouldCollapse && !showAll
    ? filteredAgents.slice(0, COLLAPSED_LIMIT)
    : filteredAgents;
  const hiddenCount = filteredAgents.length - COLLAPSED_LIMIT;

  const grouped = {
    primary: displayedAgents.filter((a) => a.role === "primary"),
    secondary: displayedAgents.filter((a) => a.role === "secondary"),
    "always-active": displayedAgents.filter((a) => a.role === "always-active"),
  };

  if (status === "idle" && agentList.length === 0) {
    return (
      <div className="h-full flex flex-col border-l bg-background">
        <div className="p-3 border-b">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">
              Agent Council
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Awaiting query...
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
              <Activity className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Send a message to activate
              <br />
              the council of experts
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col border-l bg-background">
      <div className="p-3 border-b">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-foreground" />
          <h3 className="text-sm font-semibold">
            Agent Council
          </h3>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="secondary" className="text-[10px] h-5">
            {agentsActivated} active
          </Badge>
          <Badge variant="secondary" className="text-[10px] h-5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            {agentsSucceeded} done
          </Badge>
        </div>
      </div>

      <PhaseIndicator />

      {/* Agent search/filter */}
      {agentList.length > 0 && (
        <div className="px-3 py-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter agents..."
              aria-label="Filter agents by name or domain"
              className="w-full h-7 pl-7 pr-7 rounded-md border bg-background text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-accent transition-colors"
                aria-label="Clear filter"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-3">
          {(["primary", "always-active", "secondary"] as const).map(
            (role) =>
              grouped[role].length > 0 && (
                <div key={role}>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 mb-1 font-medium">
                    {role === "always-active" ? "Always Active" : role}
                  </p>
                  <AnimatePresence>
                    {grouped[role].map((agent) => (
                      <motion.div
                        key={agent.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="mb-0.5"
                      >
                        <button
                          onClick={() =>
                            setExpandedAgent(
                              expandedAgent === agent.id ? null : agent.id
                            )
                          }
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent transition-colors text-left"
                        >
                          <div
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{
                              backgroundColor:
                                DOMAIN_COLORS[agent.domain] || "#64748b",
                            }}
                          />
                          <span className="text-xs truncate flex-1 text-foreground/80">
                            {agent.name}
                          </span>

                          {/* Selection confidence */}
                          {(agent as AgentInfoExtended).selectionConfidence !== undefined && (
                            <MiniConfidenceBar value={(agent as AgentInfoExtended).selectionConfidence!} />
                          )}

                          {/* Performance badge */}
                          <PerformanceBadge score={(agent as AgentInfoExtended).performanceScore} />

                          {/* Verification status icon */}
                          {(agent as AgentInfoExtended).verificationStatus && (
                            <VerificationMiniIcon status={(agent as AgentInfoExtended).verificationStatus!} />
                          )}

                          {/* Memory indicator */}
                          {agent.thought && agent.status === "complete" && (
                            <BrainCircuit className="h-3 w-3 text-muted-foreground/60" />
                          )}
                          <StatusIcon status={agent.status} />
                        </button>

                        <AnimatePresence>
                          {expandedAgent === agent.id && agent.thought && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mx-2 mb-2 p-2.5 rounded-md bg-muted border">
                                <p className="text-[11px] text-muted-foreground line-clamp-6 whitespace-pre-wrap leading-relaxed">
                                  {agent.thought.substring(0, 400)}
                                  {agent.thought.length > 400 ? "..." : ""}
                                </p>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  {agent.confidence && (
                                    <Badge
                                      variant="secondary"
                                      className="text-[9px] h-4"
                                    >
                                      {agent.confidence}
                                    </Badge>
                                  )}
                                  {/* Branch count */}
                                  {(agent as AgentInfoExtended).branchCount !== undefined &&
                                    (agent as AgentInfoExtended).branchCount! > 0 && (
                                    <Badge variant="secondary" className="text-[9px] h-4">
                                      <GitBranch className="h-2 w-2 mr-0.5" />
                                      {(agent as AgentInfoExtended).branchCount} branch{(agent as AgentInfoExtended).branchCount! !== 1 ? "es" : ""}
                                    </Badge>
                                  )}
                                </div>

                                {/* Inline branches preview */}
                                {(agent as AgentInfoExtended).branches &&
                                  (agent as AgentInfoExtended).branches!.length > 1 && (
                                  <BranchesPreview branches={(agent as AgentInfoExtended).branches!} selectedBranch={(agent as AgentInfoExtended).selectedBranch} />
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )
          )}

          {/* Show more/less toggle */}
          {shouldCollapse && !searchQuery && (
            <div className="px-2">
              <button
                onClick={() => setShowAll(!showAll)}
                className="w-full text-center py-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent"
              >
                {showAll
                  ? "Show less"
                  : `Show all ${filteredAgents.length} agents (${hiddenCount} more...)`}
              </button>
            </div>
          )}

          {/* No results */}
          {searchQuery && filteredAgents.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-4">
              No agents match &ldquo;{searchQuery}&rdquo;
            </p>
          )}

          {iacpMessages.length > 0 && (
            <IACPThreadedMessages messages={iacpMessages} />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
