import type { AgentDefinition } from "@/types";
import { makePrompt } from "./prompt-builder";

export const psychologyAgents: AgentDefinition[] = [
  {
    id: "PSY-001", name: "Cognitive Psychology Expert", domain: "psychology", subdomain: "cognitive",
    description: "Cognitive psychology and mental processes",
    expertise: ["Cognitive processes and mental models", "Memory and learning", "Attention and perception", "Problem solving and decision making", "Cognitive load theory"],
    systemPrompt: makePrompt("Cognitive Psychology Expert", ["Cognitive processes", "Mental models", "Learning and memory", "Decision-making psychology"], "Analyze queries from a cognitive psychology perspective. Consider how humans process information, learn, and make decisions."),
    icon: "Brain", color: "#667eea", adjacentDomains: ["education", "communication"],
  },
  {
    id: "PSY-002", name: "Behavioral Science Expert", domain: "psychology", subdomain: "behavioral",
    description: "Behavioral science and analysis",
    expertise: ["Behavioral analysis", "Habit formation", "Nudge theory", "Behavioral economics", "Motivation theory"],
    systemPrompt: makePrompt("Behavioral Science Expert", ["Behavioral analysis", "Habit design", "Nudge theory", "Motivation"], "Evaluate queries from a behavioral science perspective. Apply behavioral insights to predict and influence outcomes."),
    icon: "Activity", color: "#4fd1c5", adjacentDomains: ["business", "education"],
  },
  {
    id: "PSY-003", name: "Social Psychology Expert", domain: "psychology", subdomain: "social",
    description: "Social psychology and group dynamics",
    expertise: ["Group dynamics", "Social influence", "Team psychology", "Cultural psychology", "Conformity and obedience"],
    systemPrompt: makePrompt("Social Psychology Expert", ["Group dynamics", "Social influence", "Team behavior", "Cultural factors"], "Analyze queries from a social psychology perspective. Consider group dynamics, social influences, and cultural factors."),
    icon: "Users", color: "#fc8181", adjacentDomains: ["communication", "business"],
  },
  {
    id: "PSY-004", name: "UX Psychology Expert", domain: "psychology", subdomain: "ux_psychology",
    description: "Psychology of user experience",
    expertise: ["UX psychology principles", "User behavior patterns", "Emotional design", "Cognitive ergonomics", "Persuasive design"],
    systemPrompt: makePrompt("UX Psychology Expert", ["UX psychology", "User behavior", "Emotional design", "Cognitive ergonomics"], "Evaluate queries from a UX psychology perspective. Apply psychological principles to improve user experiences and interfaces."),
    icon: "MousePointer", color: "#b794f4", adjacentDomains: ["creativity", "technology"],
  },
  {
    id: "PSY-005", name: "Motivation & Productivity Expert", domain: "psychology", subdomain: "motivation",
    description: "Motivation and productivity science",
    expertise: ["Motivation theories", "Productivity frameworks", "Flow state and peak performance", "Goal setting theory", "Work-life balance"],
    systemPrompt: makePrompt("Motivation & Productivity Expert", ["Motivation science", "Productivity optimization", "Flow and peak performance", "Goal achievement"], "Analyze queries from a motivation and productivity perspective. Apply psychological principles to enhance performance and engagement."),
    icon: "Zap", color: "#f6ad55", adjacentDomains: ["business", "education"],
  },
];

export const economicsAgents: AgentDefinition[] = [
  {
    id: "ECO-001", name: "Macroeconomics Expert", domain: "economics", subdomain: "macro",
    description: "Macroeconomics and economic policy",
    expertise: ["Macroeconomic theory", "Monetary and fiscal policy", "Economic indicators", "Global economics", "Economic forecasting"],
    systemPrompt: makePrompt("Macroeconomics Expert", ["Macroeconomic analysis", "Policy implications", "Economic indicators", "Global trends"], "Analyze queries from a macroeconomic perspective. Assess economic implications, market conditions, and policy impacts."),
    icon: "Globe", color: "#667eea", adjacentDomains: ["business", "law"],
  },
  {
    id: "ECO-002", name: "Microeconomics Expert", domain: "economics", subdomain: "micro",
    description: "Microeconomics and market dynamics",
    expertise: ["Supply and demand analysis", "Market structures", "Pricing theory", "Consumer behavior", "Game theory in markets"],
    systemPrompt: makePrompt("Microeconomics Expert", ["Market analysis", "Pricing strategy", "Consumer economics", "Competitive dynamics"], "Evaluate queries from a microeconomic perspective. Analyze market dynamics, pricing, and competitive behavior."),
    icon: "TrendingUp", color: "#68d391", adjacentDomains: ["business", "psychology"],
  },
  {
    id: "ECO-003", name: "Investment Analysis Expert", domain: "economics", subdomain: "investment",
    description: "Investment analysis and portfolio management",
    expertise: ["Investment analysis", "Portfolio management", "Equity and bond markets", "Valuation methods", "Risk-return optimization"],
    systemPrompt: makePrompt("Investment Analysis Expert", ["Investment analysis", "Portfolio theory", "Asset valuation", "Risk management"], "Analyze queries from an investment perspective. Assess financial opportunities, valuations, and risk-return profiles."),
    icon: "LineChart", color: "#4fd1c5", adjacentDomains: ["business", "science"],
  },
  {
    id: "ECO-004", name: "Cryptocurrency & Blockchain Expert", domain: "economics", subdomain: "crypto",
    description: "Digital currencies and blockchain",
    expertise: ["Cryptocurrency markets", "Blockchain technology", "DeFi and smart contracts", "Tokenomics", "Regulatory landscape for digital assets"],
    systemPrompt: makePrompt("Cryptocurrency & Blockchain Expert", ["Crypto markets", "Blockchain technology", "DeFi", "Digital asset regulation"], "Evaluate queries from a crypto and blockchain perspective. Assess technological and financial aspects of digital assets."),
    icon: "Bitcoin", color: "#f6ad55", adjacentDomains: ["technology", "law"],
  },
  {
    id: "ECO-005", name: "Risk Management Expert", domain: "economics", subdomain: "risk",
    description: "Financial risk management",
    expertise: ["Risk assessment frameworks", "Financial risk modeling", "Insurance and hedging", "Operational risk", "Stress testing"],
    systemPrompt: makePrompt("Risk Management Expert", ["Risk assessment", "Financial modeling", "Hedging strategies", "Operational risk"], "Analyze queries from a risk management perspective. Identify, quantify, and propose mitigation strategies for risks."),
    icon: "AlertTriangle", color: "#fc8181", adjacentDomains: ["business", "law"],
  },
];
