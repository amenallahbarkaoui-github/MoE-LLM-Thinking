/**
 * Query Intelligence — local analysis, clarification, and history search.
 * No LLM calls; everything is rule-based for speed.
 */

import { prisma } from "@/lib/db";

// ─── Types ────────────────────────────────────────────────────────

export interface QueryAnalysisResult {
  isAmbiguous: boolean;
  ambiguityReasons: string[];
  suggestedClarifications: string[];
  complexity: "simple" | "moderate" | "complex";
  estimatedAgentCount: number;
  detectedTopics: string[];
  suggestedQueries: string[]; // similar past queries
}

// ─── Constants ────────────────────────────────────────────────────

const VAGUE_PRONOUNS = ["it", "this", "that", "these", "those", "they"];

const TOPIC_KEYWORDS: Record<string, string[]> = {
  technology: ["code", "software", "app", "website", "api", "database", "programming", "tech", "system", "server", "frontend", "backend", "deploy", "cloud", "ai", "machine learning"],
  business: ["business", "startup", "company", "market", "strategy", "product", "management", "revenue", "customer", "brand", "growth"],
  law: ["legal", "law", "regulation", "compliance", "patent", "copyright", "contract", "privacy", "gdpr"],
  science: ["research", "data", "experiment", "hypothesis", "analysis", "scientific", "study", "biology", "chemistry", "physics"],
  creativity: ["design", "ui", "ux", "creative", "visual", "brand", "game", "media", "video", "art", "music"],
  education: ["learn", "teach", "course", "education", "training", "curriculum", "student"],
  philosophy: ["ethics", "moral", "logic", "think", "philosophy", "decision", "meaning"],
  communication: ["write", "communicate", "language", "translate", "document", "content"],
  psychology: ["behavior", "cognitive", "motivation", "psychology", "user experience", "habit"],
  economics: ["economy", "finance", "invest", "market", "price", "crypto", "risk", "money", "budget"],
};

const ABBREVIATIONS: Record<string, string> = {
  ai: "artificial intelligence",
  ml: "machine learning",
  nlp: "natural language processing",
  ui: "user interface",
  ux: "user experience",
  api: "application programming interface",
  db: "database",
  devops: "development operations",
  ci: "continuous integration",
  cd: "continuous delivery",
  saas: "software as a service",
  llm: "large language model",
  iot: "internet of things",
};

// ─── Implementation ───────────────────────────────────────────────

export class QueryIntelligence {
  /**
   * Analyse a query for ambiguity, complexity, and topic detection.
   */
  analyzeQuery(query: string): QueryAnalysisResult {
    const words = query.trim().split(/\s+/);
    const lower = query.toLowerCase();

    // ── Ambiguity detection ──
    const ambiguityReasons: string[] = [];

    if (query.trim().length < 10) {
      ambiguityReasons.push("Query is very short — consider adding more detail");
    }

    // Vague pronouns without prior context
    for (const pronoun of VAGUE_PRONOUNS) {
      const regex = new RegExp(`\\b${pronoun}\\b`, "i");
      if (regex.test(query)) {
        ambiguityReasons.push(
          `Contains pronoun "${pronoun}" without clear referent`
        );
        break; // one reason is enough
      }
    }

    // No clear question structure (no question mark or question word)
    const questionWords = ["what", "how", "why", "when", "where", "who", "which", "can", "could", "should", "would", "is", "are", "do", "does"];
    const hasQuestionStructure =
      query.includes("?") ||
      questionWords.some((w) => lower.startsWith(w + " "));
    if (!hasQuestionStructure && words.length > 2) {
      ambiguityReasons.push("No clear question structure detected");
    }

    // ── Topic detection ──
    const detectedTopics: string[] = [];
    for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
      if (keywords.some((kw) => lower.includes(kw))) {
        detectedTopics.push(topic);
      }
    }

    // Multiple unrelated topics
    if (detectedTopics.length >= 4) {
      ambiguityReasons.push(
        "Multiple unrelated topics detected — try narrowing down"
      );
    }

    const isAmbiguous = ambiguityReasons.length > 0;

    // ── Complexity ──
    let complexity: "simple" | "moderate" | "complex";
    if (detectedTopics.length >= 4 || words.length > 50) {
      complexity = "complex";
    } else if (detectedTopics.length >= 2 || words.length > 20) {
      complexity = "moderate";
    } else {
      complexity = "simple";
    }

    // ── Estimated agent count ──
    let estimatedAgentCount: number;
    if (complexity === "simple") estimatedAgentCount = 4;
    else if (complexity === "moderate") estimatedAgentCount = 7;
    else estimatedAgentCount = 12;

    // ── Clarifications ──
    const suggestedClarifications = isAmbiguous
      ? this.generateClarifications(query, ambiguityReasons)
      : [];

    return {
      isAmbiguous,
      ambiguityReasons,
      suggestedClarifications,
      complexity,
      estimatedAgentCount,
      detectedTopics,
      suggestedQueries: [],
    };
  }

  // ─── Query Optimisation ─────────────────────────────────────────

  /**
   * Light rewriting: expand abbreviations, collapse whitespace, trim.
   * Does NOT call an LLM.
   */
  optimizeQuery(query: string): string {
    let optimised = query.trim().replace(/\s+/g, " ");

    // Expand known abbreviations (whole-word only)
    for (const [abbr, expansion] of Object.entries(ABBREVIATIONS)) {
      const regex = new RegExp(`\\b${abbr}\\b`, "gi");
      optimised = optimised.replace(regex, (match) => {
        // Preserve original casing of first letter
        return match[0] === match[0].toUpperCase()
          ? expansion.charAt(0).toUpperCase() + expansion.slice(1)
          : expansion;
      });
    }

    return optimised;
  }

  // ─── History Search ─────────────────────────────────────────────

  /**
   * Find similar queries from past sessions using Prisma.
   * Falls back gracefully if the DB is unavailable.
   */
  async findSimilarFromHistory(
    query: string,
    limit = 5
  ): Promise<{ query: string; sessionId: string }[]> {
    try {
      // Extract significant words (>= 4 chars) for LIKE matching
      const keywords = query
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length >= 4)
        .slice(0, 5);

      if (keywords.length === 0) return [];

      // Search sessions that contain any of the keywords
      const sessions = await prisma.session.findMany({
        where: {
          status: "COMPLETED",
          OR: keywords.map((kw) => ({
            query: { contains: kw },
          })),
        },
        select: { id: true, query: true },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      return sessions.map((s) => ({ query: s.query, sessionId: s.id }));
    } catch {
      // DB unavailable — return empty
      return [];
    }
  }

  // ─── Clarification Generation ───────────────────────────────────

  /**
   * Return 2-4 clarification questions / refined-query suggestions.
   */
  generateClarifications(query: string, reasons: string[]): string[] {
    const clarifications: string[] = [];

    for (const reason of reasons) {
      if (reason.includes("very short")) {
        clarifications.push(
          `Could you provide more context? For example: "${query} — specifically regarding …"`
        );
      }
      if (reason.includes("pronoun")) {
        clarifications.push(
          "What does the pronoun refer to? Try replacing it with the actual subject."
        );
      }
      if (reason.includes("No clear question")) {
        clarifications.push(
          'Try rephrasing as a question, e.g. "How can I ...?" or "What is the best way to ...?"'
        );
      }
      if (reason.includes("Multiple unrelated topics")) {
        clarifications.push(
          "Your query spans many topics. Consider splitting into separate questions for each topic."
        );
      }
    }

    // Always cap at 4
    return clarifications.slice(0, 4);
  }
}

/** Singleton instance. */
export const queryIntelligence = new QueryIntelligence();
