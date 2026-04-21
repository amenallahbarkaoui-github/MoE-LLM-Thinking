import type { AgentDefinition } from "@/types";
import { makePrompt } from "./prompt-builder";

export const lawAgents: AgentDefinition[] = [
  {
    id: "LAW-001", name: "General Law Expert", domain: "law", subdomain: "general_law",
    description: "General law, legislation, legal frameworks",
    expertise: ["General legal principles", "Contract law", "Civil and commercial law", "Regulatory frameworks", "Legal compliance"],
    systemPrompt: makePrompt("General Law Expert", ["Legal frameworks and principles", "Contract and commercial law", "Regulatory compliance", "Legal risk assessment"], "Analyze queries from a legal perspective. Identify legal implications, compliance requirements, and potential risks."),
    icon: "Scale", color: "#667eea", adjacentDomains: ["business", "technology"],
  },
  {
    id: "LAW-002", name: "IP & Technology Law Expert", domain: "law", subdomain: "ip_law",
    description: "Intellectual property, technology law",
    expertise: ["Intellectual property rights", "Patent and trademark law", "Technology licensing", "Software law", "Digital rights management"],
    systemPrompt: makePrompt("IP & Technology Law Expert", ["Intellectual property protection", "Technology licensing", "Software patents", "Digital rights"], "Evaluate queries from an IP and technology law perspective. Assess intellectual property concerns and tech-specific legal issues."),
    icon: "Copyright", color: "#b794f4", adjacentDomains: ["technology", "business"],
  },
  {
    id: "LAW-003", name: "Privacy & Data Law Expert", domain: "law", subdomain: "privacy_law",
    description: "GDPR, data protection, privacy regulations",
    expertise: ["GDPR and data protection", "Privacy regulations", "Data handling compliance", "Cross-border data transfers", "Privacy by design"],
    systemPrompt: makePrompt("Privacy & Data Law Expert", ["GDPR and privacy regulations", "Data protection compliance", "Privacy by design principles", "Cross-border data handling"], "Analyze queries from a data privacy perspective. Ensure compliance with privacy regulations and data protection standards."),
    icon: "Lock", color: "#fc8181", adjacentDomains: ["technology", "business"],
  },
  {
    id: "LAW-004", name: "Contract Law Expert", domain: "law", subdomain: "contract_law",
    description: "Contracts, agreements, commercial law",
    expertise: ["Contract drafting and negotiation", "Commercial agreements", "Service level agreements", "Terms of service", "Dispute resolution"],
    systemPrompt: makePrompt("Contract Law Expert", ["Contract law and negotiation", "Commercial agreements", "SLA design", "Dispute resolution"], "Evaluate queries from a contract law perspective. Focus on contractual obligations, risk allocation, and legal enforceability."),
    icon: "FileText", color: "#4fd1c5", adjacentDomains: ["business", "economics"],
  },
  {
    id: "LAW-005", name: "Compliance Expert", domain: "law", subdomain: "compliance",
    description: "Regulatory compliance, standards",
    expertise: ["Regulatory compliance frameworks", "Industry standards (ISO, SOC)", "Audit preparation", "Risk management", "Corporate governance"],
    systemPrompt: makePrompt("Compliance Expert", ["Regulatory compliance", "Industry standards", "Audit and governance", "Risk management frameworks"], "Analyze queries from a compliance perspective. Identify regulatory requirements and ensure adherence to industry standards."),
    icon: "CheckSquare", color: "#68d391", adjacentDomains: ["business", "technology"],
  },
];
