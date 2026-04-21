export interface CostEstimate {
  estimatedTokens: number;
  estimatedCost: number;
  currency: string;
}

interface ModelPricing {
  inputPer1M: number;
  outputPer1M: number;
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  "gpt-4o": { inputPer1M: 2.5, outputPer1M: 10 },
  "gpt-4-turbo": { inputPer1M: 10, outputPer1M: 30 },
  "gpt-3.5-turbo": { inputPer1M: 0.5, outputPer1M: 1.5 },
  "claude-sonnet-4-20250514": { inputPer1M: 3, outputPer1M: 15 },
  "claude-3-opus": { inputPer1M: 15, outputPer1M: 75 },
  "claude-3-opus-20240229": { inputPer1M: 15, outputPer1M: 75 },
  "glm-5.1": { inputPer1M: 0.5, outputPer1M: 0.5 },
};

const DEFAULT_PRICING: ModelPricing = { inputPer1M: 1, outputPer1M: 3 };

const DEFAULT_PROMPT_TOKENS = 500;
const DEFAULT_COMPLETION_TOKENS = 300;

export function estimateQueryCost(params: {
  agentCount: number;
  model: string;
  averagePromptTokens?: number;
  averageCompletionTokens?: number;
}): CostEstimate {
  const {
    agentCount,
    model,
    averagePromptTokens = DEFAULT_PROMPT_TOKENS,
    averageCompletionTokens = DEFAULT_COMPLETION_TOKENS,
  } = params;

  // Phases: thinking (all agents) + discussion (primary + always-active only, ~2/3 of agents) + synthesis (1 call)
  const discussionAgents = Math.ceil(agentCount * 0.67);
  const totalCalls = agentCount + discussionAgents + 1;

  const totalPromptTokens = totalCalls * averagePromptTokens;
  const totalCompletionTokens = totalCalls * averageCompletionTokens;
  const estimatedTokens = totalPromptTokens + totalCompletionTokens;

  // Try exact match first, then prefix match (e.g., "claude-3-opus-20240229" matches "claude-3-opus")
  let pricing = MODEL_PRICING[model];
  if (!pricing) {
    for (const [key, val] of Object.entries(MODEL_PRICING)) {
      if (model.startsWith(key)) { pricing = val; break; }
    }
  }
  if (!pricing) pricing = DEFAULT_PRICING;
  const inputCost = (totalPromptTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (totalCompletionTokens / 1_000_000) * pricing.outputPer1M;
  const estimatedCost = Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;

  return {
    estimatedTokens,
    estimatedCost,
    currency: "USD",
  };
}
