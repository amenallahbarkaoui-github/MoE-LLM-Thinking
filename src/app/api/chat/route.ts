import { NextRequest } from "next/server";
import { CouncilLeader } from "@/core/council/leader";
import { GLMProvider } from "@/core/providers/glm";
import { OpenAIProvider } from "@/core/providers/openai";
import { AnthropicProvider } from "@/core/providers/anthropic";
import { OllamaProvider } from "@/core/providers/ollama";
import { MockProvider } from "@/core/providers/mock";
import type { SSEEvent } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_QUERY_LENGTH = 10_000;

/**
 * Patterns commonly found in prompt-injection / jailbreak attempts.
 * Each regex is tested against the lowercased query.
 */
const JAILBREAK_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /ignore\s+(all\s+)?prior\s+instructions/i,
  /disregard\s+(all\s+)?previous\s+instructions/i,
  /disregard\s+(all\s+)?prior\s+instructions/i,
  /forget\s+(all\s+)?previous\s+instructions/i,
  /override\s+(all\s+)?previous\s+instructions/i,
  /you\s+are\s+now\s+(a|an)\s+/i,
  /pretend\s+you\s+are/i,
  /act\s+as\s+if\s+you/i,
  /reveal\s+(your\s+)?system\s+prompt/i,
  /show\s+(your\s+)?system\s+prompt/i,
  /output\s+(your\s+)?system\s+prompt/i,
  /what\s+is\s+your\s+system\s+prompt/i,
  /repeat\s+(your\s+)?initial\s+instructions/i,
  /\bDAN\b.*\bjailbreak/i,
  /do\s+anything\s+now/i,
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSSE(event: SSEEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

/** Strip control characters (except newline, tab, carriage return). */
function sanitizeInput(text: string): string {
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

function detectPromptInjection(text: string): boolean {
  return JAILBREAK_PATTERNS.some((p) => p.test(text));
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Resolve the API key for a provider from server-side environment variables.
 * Client-supplied keys are intentionally ignored.
 */
function resolveApiKey(providerName: string): string {
  switch (providerName) {
    case "glm":
      return process.env.GLM_API_KEY ?? "";
    case "openai":
      return process.env.OPENAI_API_KEY ?? "";
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY ?? "";
    default:
      return process.env.GLM_API_KEY ?? "";
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // --- Parse body -----------------------------------------------------------
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const {
    query: rawQuery,
    provider: providerName = "glm",
    model = process.env.GLM_MODEL || "glm-5.1",
    maxAgents = 7,
    concurrencyLimit = 3,
    iacpEnabled = true,
  } = body as {
    query?: string;
    provider?: string;
    model?: string;
    maxAgents?: number;
    concurrencyLimit?: number;
    iacpEnabled?: boolean;
  };

  // --- Validate query -------------------------------------------------------
  if (!rawQuery || typeof rawQuery !== "string") {
    return jsonError("Query is required and must be a string", 400);
  }

  if (rawQuery.length > MAX_QUERY_LENGTH) {
    return jsonError(
      `Query exceeds maximum length of ${MAX_QUERY_LENGTH} characters`,
      400,
    );
  }

  // --- Sanitize input -------------------------------------------------------
  const query = sanitizeInput(rawQuery.trim());

  if (!query) {
    return jsonError("Query is empty after sanitization", 400);
  }

  // --- Prompt injection detection -------------------------------------------
  if (detectPromptInjection(query)) {
    return jsonError(
      "Your message was flagged by our safety filter. Please rephrase your query.",
      400,
    );
  }

  // --- Validate numeric params ----------------------------------------------
  const safeMaxAgents = Math.min(Math.max(Number(maxAgents) || 7, 1), 20);
  const safeConcurrency = Math.min(
    Math.max(Number(concurrencyLimit) || 3, 1),
    10,
  );

  // --- Build SSE stream -----------------------------------------------------
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: SSEEvent) => {
        try {
          controller.enqueue(encoder.encode(formatSSE(event)));
        } catch {
          // Stream may be closed
        }
      };

      try {
        // Create provider — API key is resolved server-side only
        const providerKey = String(providerName).toLowerCase();
        let provider;
        switch (providerKey) {
          case "mock":
            provider = new MockProvider();
            break;
          case "openai":
            provider = new OpenAIProvider(resolveApiKey("openai"));
            break;
          case "anthropic":
            provider = new AnthropicProvider(resolveApiKey("anthropic"));
            break;
          case "ollama": {
            const ollamaUrl = (body as Record<string, unknown>).ollamaBaseUrl as string | undefined;
            provider = new OllamaProvider(ollamaUrl);
            break;
          }
          default: {
            // GLM (default)
            const key = resolveApiKey("glm");
            const baseUrl = process.env.GLM_BASE_URL;
            provider = new GLMProvider(key, baseUrl);
            break;
          }
        }

        console.log(`[chat] Using provider: ${providerKey}, model: ${model}`);

        const leader = new CouncilLeader(provider, {
          maxAgents: safeMaxAgents,
          iacpEnabled: Boolean(iacpEnabled),
          model: String(model),
          concurrencyLimit: safeConcurrency,
        });

        await leader.orchestrate(query, emit);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Internal server error";

        emit({
          type: "council:error",
          data: { error: message },
          timestamp: Date.now(),
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
