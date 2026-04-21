import type { AgentDomain } from "@/types";

export const ADJACENCY_MAP: Record<AgentDomain, AgentDomain[]> = {
  technology: ["business", "science", "law", "creativity"],
  business: ["technology", "economics", "law", "psychology"],
  law: ["business", "technology", "philosophy", "communication"],
  science: ["technology", "education", "philosophy", "economics"],
  creativity: ["technology", "psychology", "communication", "education"],
  education: ["psychology", "creativity", "science", "communication"],
  philosophy: ["science", "psychology", "law", "education"],
  communication: ["business", "psychology", "creativity", "education"],
  psychology: ["communication", "education", "business", "creativity"],
  economics: ["business", "law", "science", "psychology"],
  cross: ["technology", "business", "law", "science", "creativity", "education", "philosophy", "communication", "psychology", "economics"],
};
