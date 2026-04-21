import { agentRegistry } from "@/core/agents/registry";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get("domain");

  let agents;
  if (domain) {
    agents = agentRegistry.getByDomain(domain as import("@/types").AgentDomain);
  } else {
    agents = agentRegistry.getAll();
  }

  // Strip systemPrompt from public response
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const publicAgents = agents.map(({ systemPrompt: _sp, ...rest }) => rest);

  return Response.json({
    agents: publicAgents,
    total: publicAgents.length,
    domains: agentRegistry.getDomains(),
  });
}
