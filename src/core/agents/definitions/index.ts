import type { AgentDefinition } from "@/types";
import { technologyAgents } from "./technology";
import { businessAgents } from "./business";
import { lawAgents } from "./law";
import { scienceAgents } from "./science";
import { creativityAgents, educationAgents } from "./creativity";
import { philosophyAgents, communicationAgents } from "./philosophy";
import { psychologyAgents, economicsAgents } from "./psychology";
import { crossDomainAgents } from "./cross-domain";

export const ALL_AGENTS: AgentDefinition[] = [
  ...technologyAgents,
  ...businessAgents,
  ...lawAgents,
  ...scienceAgents,
  ...creativityAgents,
  ...educationAgents,
  ...philosophyAgents,
  ...communicationAgents,
  ...psychologyAgents,
  ...economicsAgents,
  ...crossDomainAgents,
];

export {
  technologyAgents,
  businessAgents,
  lawAgents,
  scienceAgents,
  creativityAgents,
  educationAgents,
  philosophyAgents,
  communicationAgents,
  psychologyAgents,
  economicsAgents,
  crossDomainAgents,
};
