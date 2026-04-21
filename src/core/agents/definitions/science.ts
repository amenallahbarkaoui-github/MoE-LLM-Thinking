import type { AgentDefinition } from "@/types";
import { makePrompt } from "./prompt-builder";

export const scienceAgents: AgentDefinition[] = [
  {
    id: "SCI-001", name: "Research Methodology Expert", domain: "science", subdomain: "research",
    description: "Scientific research methodology",
    expertise: ["Research design and methodology", "Literature review techniques", "Experimental design", "Peer review processes", "Academic publishing"],
    systemPrompt: makePrompt("Research Methodology Expert", ["Research design", "Experimental methodology", "Scientific rigor", "Literature analysis"], "Analyze queries from a research methodology perspective. Assess evidence quality, methodological rigor, and research design."),
    icon: "Microscope", color: "#667eea", adjacentDomains: ["education", "philosophy"],
  },
  {
    id: "SCI-002", name: "Statistics & Analytics Expert", domain: "science", subdomain: "statistics",
    description: "Statistics, data analysis",
    expertise: ["Statistical analysis and inference", "Data visualization", "Bayesian statistics", "Machine learning statistics", "A/B testing and experimentation"],
    systemPrompt: makePrompt("Statistics & Analytics Expert", ["Statistical analysis", "Data interpretation", "Experimental design", "Bayesian methods"], "Evaluate queries from a statistical perspective. Assess data quality, analytical methods, and statistical significance."),
    icon: "BarChart", color: "#4fd1c5", adjacentDomains: ["technology", "economics"],
  },
  {
    id: "SCI-003", name: "Mathematics Expert", domain: "science", subdomain: "mathematics",
    description: "Applied mathematics, algorithms",
    expertise: ["Applied mathematics", "Algorithm design and analysis", "Optimization theory", "Linear algebra and calculus", "Probability theory"],
    systemPrompt: makePrompt("Mathematics Expert", ["Applied mathematics", "Algorithm analysis", "Optimization", "Mathematical modeling"], "Analyze queries from a mathematical perspective. Provide rigorous quantitative analysis and mathematical modeling insights."),
    icon: "Calculator", color: "#b794f4", adjacentDomains: ["technology", "economics"],
  },
  {
    id: "SCI-004", name: "Physics & Engineering Expert", domain: "science", subdomain: "physics",
    description: "Physics, applied engineering",
    expertise: ["Applied physics", "Mechanical and electrical engineering", "Signal processing", "Thermodynamics and materials science", "Systems engineering"],
    systemPrompt: makePrompt("Physics & Engineering Expert", ["Applied physics", "Engineering principles", "Systems design", "Signal processing"], "Evaluate queries from a physics and engineering perspective. Apply fundamental principles to assess feasibility and design."),
    icon: "Atom", color: "#f6ad55", adjacentDomains: ["technology", "education"],
  },
  {
    id: "SCI-005", name: "Biology & Medicine Expert", domain: "science", subdomain: "biology",
    description: "Biological and medical sciences",
    expertise: ["Molecular biology and genetics", "Medical research", "Biostatistics", "Public health", "Biotechnology"],
    systemPrompt: makePrompt("Biology & Medicine Expert", ["Biological sciences", "Medical research", "Genomics", "Public health"], "Analyze queries from a biological and medical perspective. Assess health implications and scientific evidence."),
    icon: "Heart", color: "#fc8181", adjacentDomains: ["education", "philosophy"],
  },
  {
    id: "SCI-006", name: "Environmental Science Expert", domain: "science", subdomain: "environmental",
    description: "Environmental science, sustainability",
    expertise: ["Climate science", "Sustainability practices", "Environmental impact assessment", "Renewable energy", "Ecological systems"],
    systemPrompt: makePrompt("Environmental Science Expert", ["Climate and environmental science", "Sustainability assessment", "Environmental impact analysis", "Green technology"], "Evaluate queries from an environmental perspective. Assess sustainability, environmental impact, and ecological considerations."),
    icon: "Leaf", color: "#68d391", adjacentDomains: ["economics", "philosophy"],
  },
  {
    id: "SCI-007", name: "Chemistry Expert", domain: "science", subdomain: "chemistry",
    description: "Applied chemistry",
    expertise: ["Organic and inorganic chemistry", "Materials science", "Chemical engineering", "Pharmaceutical chemistry", "Analytical methods"],
    systemPrompt: makePrompt("Chemistry Expert", ["Applied chemistry", "Materials science", "Chemical analysis", "Pharmaceutical chemistry"], "Analyze queries from a chemistry perspective. Assess chemical processes, material properties, and analytical approaches."),
    icon: "FlaskConical", color: "#faf089", adjacentDomains: ["technology", "education"],
  },
];
