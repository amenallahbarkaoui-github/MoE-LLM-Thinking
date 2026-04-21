import { providerRegistry } from "@/core/providers/registry";

export async function GET() {
  const providers = providerRegistry.getAll().map((p) => ({
    name: p.name,
    models: p.models,
    configured: Boolean(
      (() => {
        switch (p.name) {
          case "glm":
            return process.env.GLM_API_KEY;
          case "openai":
            return process.env.OPENAI_API_KEY;
          case "anthropic":
            return process.env.ANTHROPIC_API_KEY;
          case "Ollama":
          case "Mock Provider":
            return true;
          default:
            return undefined;
        }
      })(),
    ),
  }));

  return Response.json({ providers });
}
