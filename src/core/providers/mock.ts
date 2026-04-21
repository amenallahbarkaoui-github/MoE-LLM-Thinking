import type { ChatParams, ChatResponse, ProviderCapabilities } from "@/types";
import { BaseProvider } from "./base";

const MOCK_RESPONSES: Record<string, string[]> = {
  technology: [
    "From a technical architecture perspective, this involves several key considerations. First, the system should be designed with scalability in mind, using microservices or modular architecture. Consider implementing proper caching layers and load balancing. The technology stack should be chosen based on the specific requirements of throughput, latency, and data consistency.",
    "The frontend implementation should leverage modern frameworks with server-side rendering for optimal performance. Consider implementing progressive web app features and ensuring accessibility compliance. The UI architecture should follow component-driven design patterns.",
    "From a security standpoint, implement defense in depth. This includes input validation, proper authentication/authorization (OAuth 2.0/JWT), rate limiting, and encryption at rest and in transit. Regular security audits and penetration testing are essential.",
  ],
  business: [
    "From a business strategy perspective, this presents several opportunities. The market analysis suggests a growing demand in this space. Key success factors include understanding the target customer segment, establishing clear value propositions, and developing sustainable competitive advantages. Consider a lean startup approach with rapid iteration.",
    "The project management approach should follow agile methodologies. Break this into manageable sprints with clear deliverables. Stakeholder communication is critical - establish regular check-ins and transparent progress reporting.",
  ],
  science: [
    "The scientific methodology here should follow rigorous standards. Start with a clear hypothesis, design controlled experiments, and ensure reproducibility. Statistical analysis should use appropriate methods given the data distribution and sample size.",
    "From a data analysis perspective, consider using advanced statistical methods. Ensure proper data preprocessing and feature engineering. The analytical framework should account for potential confounding variables.",
  ],
  general: [
    "This is a multifaceted question that benefits from multiple perspectives. Let me analyze the key components and provide a comprehensive assessment based on my expertise.",
  ],
};

export class MockProvider extends BaseProvider {
  name = "Mock Provider";
  baseUrl = "mock://localhost";
  models = ["mock-fast", "mock-detailed"];
  concurrencyLimit = 10;
  rateLimit = { rpm: 1000, tpm: 1000000 };

  private minDelay: number;
  private maxDelay: number;

  constructor(minDelay = 500, maxDelay = 2000) {
    super();
    this.apiKey = "mock-key";
    this.minDelay = minDelay;
    this.maxDelay = maxDelay;
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsStreaming: true,
      supportsTools: false,
      maxContextWindow: 128000,
      supportedModalities: ["text"],
    };
  }

  async chat(params: ChatParams): Promise<ChatResponse> {
    const delay =
      this.minDelay + Math.random() * (this.maxDelay - this.minDelay);
    await new Promise((resolve) => setTimeout(resolve, delay));

    const systemMessage = params.messages.find((m) => m.role === "system");
    const userMessage =
      params.messages.find((m) => m.role === "user")?.content || "";

    let domain = "general";
    if (systemMessage?.content) {
      const content = systemMessage.content.toLowerCase();
      if (
        content.includes("software") ||
        content.includes("tech") ||
        content.includes("code")
      )
        domain = "technology";
      else if (
        content.includes("business") ||
        content.includes("strateg") ||
        content.includes("market")
      )
        domain = "business";
      else if (
        content.includes("science") ||
        content.includes("research") ||
        content.includes("data")
      )
        domain = "science";
    }

    const responses = MOCK_RESPONSES[domain] || MOCK_RESPONSES.general;
    const response = responses[Math.floor(Math.random() * responses.length)];

    const contextualResponse = `**Analysis of "${userMessage.substring(0, 50)}..."**\n\n${response}\n\n**Confidence Level:** ${
      Math.random() > 0.3 ? "HIGH" : "MEDIUM"
    }`;

    return {
      content: contextualResponse,
      model: params.model || "mock-fast",
      usage: {
        promptTokens: Math.floor(Math.random() * 500) + 100,
        completionTokens: Math.floor(Math.random() * 300) + 50,
        totalTokens: Math.floor(Math.random() * 800) + 150,
      },
    };
  }

  async *streamChat(params: ChatParams): AsyncGenerator<string, void, unknown> {
    const response = await this.chat(params);
    const words = response.content.split(" ");
    for (const word of words) {
      await new Promise((resolve) => setTimeout(resolve, 30 + Math.random() * 50));
      yield word + " ";
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async validateApiKey(_key?: string): Promise<boolean> {
    return true;
  }
}
