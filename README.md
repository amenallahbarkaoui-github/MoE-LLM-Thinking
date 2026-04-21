# MoE LLM Thinking

> **State-of-the-Art Mixture-of-Experts Reasoning Framework for Large Language Models**

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma)](https://www.prisma.io/)
[![Jest](https://img.shields.io/badge/Jest-30-C21325?logo=jest)](https://jestjs.io/)
[![Agents](https://img.shields.io/badge/Agents-70+-9333EA)](#)
[![Domains](https://img.shields.io/badge/Domains-10+-059669)](#)

---

## Overview

<img width="526" height="586" alt="image" src="https://github.com/user-attachments/assets/93ca3f35-3e74-4dc7-bd44-cb31495cfc9d" />



**MoE LLM Thinking** is a multi-agent AI system that orchestrates **up to 70 specialized agents across 10+ domains**. It moves beyond traditional chat applications by enabling collaborative reasoning, inter-agent communication, and structured synthesis with confidence scoring. The system emphasizes transparency and depth: agents discuss among themselves, reach consensus or highlight disagreement, and produce a unified, weighted synthesis. Real-time streaming delivers early insights, evolving analysis, and the final comprehensive response.

### Key Value Propositions

- **Collaborative Reasoning** — Multiple agents analyze queries from distinct domains and debate perspectives.
- **Inter-Agent Communication Protocol (IACP)** — A structured messaging bus enables targeted, prioritized, and threaded communication.
- **Tree-of-Thought & Chain-of-Thought** — Agents employ branching and stepwise logic with confidence estimation.
- **Real-Time Streaming** — Users receive progressive insights as agents contribute, improving perceived responsiveness.
- **Transparency** — The system surfaces consensus/disagreement, confidence levels, and agent contributions.

### Target Use Cases

- Strategic decision-making requiring multi-perspective analysis
- Risk and compliance assessments across legal, ethical, and technical domains
- Research synthesis and idea generation with structured evaluation
- Enterprise knowledge work that benefits from expert-council-style deliberation

---

## Why MoE LLM Thinking?

| Capability | Traditional Single-Model | MoE LLM Thinking |
|------------|-------------------------|------------------|
| **Reasoning Depth** | Limited by single context window | Recursive multi-agent deliberation with consensus |
| **Domain Expertise** | Generalist, no specialization | 70+ experts across 10+ domains with dedicated specialization |
| **Fault Tolerance** | Single point of failure | Redundant expert validation & circuit-breaker resiliency |
| **Cost Efficiency** | Fixed per-token cost | Dynamic budget allocation & intelligent provider routing |
| **Scalability** | Vertical only | Horizontal expert scaling with concurrency management |
| **Verifiability** | Black-box output | Transparent reasoning graph with confidence scoring & adjacency tracking |

---

## How It Works

When you submit a query, the system executes a sophisticated multi-stage reasoning pipeline:

```
User Query
    │
    ▼
┌─────────────┐
│   Router    │ ── Analyzes intent, selects relevant expert agents
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  IACP Bus   │ ── Dispatches query to selected experts in parallel
└──────┬──────┘
       │
   ┌───┴───┐
   ▼       ▼
Expert A  Expert B  Expert C
(Logic)   (Code)    (Creative)
   │       │         │
   └───┬───┴─────────┘
       ▼
┌─────────────┐
│   Council   │ ── Agents debate, critique, and refine each other's outputs
│  Deliberation│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Consensus  │ ── Adjacency-matrix convergence on optimal answer
│   Engine    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Final     │ ── Synthesized, high-confidence response delivered to user
│   Output    │
└─────────────┘
```

---

## Core Architecture

The system integrates frontend, backend, and orchestration layers to deliver a responsive, transparent multi-agent experience.

```
┌─────────────────────────────────────────────────────────────┐
│                    MoE LLM Thinking                          │
│                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Router    │───▶│ IACP Bus    │◀───│  Registry   │     │
│  │   Layer     │    │ (Messaging) │    │  & Config   │     │
│  └─────────────┘    └──────┬──────┘    └─────────────┘     │
│                            │                                 │
│        ┌───────────────────┼───────────────────┐            │
│        ▼                   ▼                   ▼            │
│  ┌──────────┐       ┌──────────┐       ┌──────────┐        │
│  │  Expert  │◀─────▶│  Expert  │◀─────▶│  Expert  │        │
│  │  Agent A │       │  Agent B │       │  Agent N │        │
│  │ (Logic)  │       │ (Code)   │       │(Creative)│        │
│  └────┬─────┘       └────┬─────┘       └────┬─────┘        │
│       └───────────────────┼───────────────────┘            │
│                           ▼                                 │
│                    ┌─────────────┐                          │
│                    │  Consensus  │                          │
│                    │   Engine    │                          │
│                    └──────┬──────┘                          │
│                           ▼                                 │
│                    ┌─────────────┐                          │
│                    │   Output    │                          │
│                    │  Synthesis  │                          │
│                    └─────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

### Architecture Layers

| Layer | Responsibility |
|-------|---------------|
| **Frontend** | Next.js 16 App Router, React 19, Zustand state, SSE consumption |
| **API** | Route handlers, security middleware, streaming response delivery |
| **Orchestration** | Agent selection, IACP messaging, council deliberation, synthesis |
| **Reasoning** | Tree-of-thought, chain-of-thought, confidence estimation |
| **Providers** | Dynamic provider registration, key resolution, failover routing |

### Key Components

- **Agent Registry & Management** — Dynamic registration of up to 70 agents across 10+ domains with health monitoring.
- **Provider Abstraction Layer** — Universal adapter for OpenAI, Anthropic, GLM, Ollama, and custom providers with automatic failover.
- **IACP Bus** — High-performance messaging fabric supporting directed/broadcast messages, threading, priority ordering, and routing hints by domain or expertise.
- **Synthesis & Consensus Engine** — Weights agent thoughts by confidence and domain relevance, detects consensus/disagreement, and produces unified responses.
- **Budget & Cost Optimizer** — Real-time token-budget tracking, predictive cost estimation, and intelligent provider selection.
- **Concurrency & Rate Limiting** — Enterprise-grade request throttling with circuit-breaker resilience and sliding-window rate limiting.
- **Memory Management** — Persistent session memory via Prisma + SQLite with intelligent context retrieval.
- **Security Middleware** — CORS enforcement, CSP headers, rate limiting, and origin validation.

---

## Reasoning Engine

MoE LLM Thinking implements advanced reasoning patterns that go beyond standard prompt-response:

### Tree-of-Thought (ToT)

Agents explore multiple reasoning branches simultaneously, evaluating each path's validity before converging on the most promising approach.

```
        Query
         │
    ┌────┼────┐
    ▼    ▼    ▼
  Path A Path B Path C
    │    │    │
    ▼    ▼    ▼
  Score A Score B Score C
    │    │    │
    └────┼────┘
         ▼
    Best Path Selected
```

### Chain-of-Thought (CoT)

Step-by-step logical reasoning with intermediate validation:

1. Decompose the problem into sub-tasks
2. Solve each sub-task with explicit reasoning
3. Validate intermediate conclusions
4. Synthesize final answer with confidence score

### Confidence Estimation

Each agent thought includes a confidence score (0.0-1.0) that influences:
- Weight in the final synthesis
- Consensus detection thresholds
- Disagreement surfacing for transparency

---

## Inter-Agent Communication Protocol (IACP)

IACP is a structured messaging bus that governs how agents communicate during deliberation:

| Feature | Description |
|---------|-------------|
| **Directed Messages** | Send targeted queries to specific agents by ID |
| **Broadcast** | Distribute information to all active agents in the council |
| **Threading** | Maintain conversation context across message exchanges |
| **Priority Ordering** | Critical messages (e.g., contradictions) processed first |
| **Routing Hints** | Route by domain, expertise, or availability |
| **Message Types** | Query, Response, Challenge, Consensus, Disagreement |

This enables agents to challenge each other's conclusions, request clarification, and build consensus through structured dialogue — not just isolated inference.

---

## Expert Agent Domains

The system supports **up to 70 specialized agents** across **10+ cognitive domains**:

| Domain | Example Agents | Role |
|--------|---------------|------|
| **Logic** | Formal Logic, Mathematical Reasoning, Syllogism Validator | Validates structural soundness, detects fallacies |
| **Code** | Software Engineering, Security Audit, Architecture Review | Generates, reviews, and secures code |
| **Creative** | Ideation, Design Thinking, Narrative Construction | Brainstorms novel approaches, challenges assumptions |
| **Research** | Literature Review, Data Analysis, Source Verification | Gathers evidence, cites sources, fact-checks |
| **Critique** | Adversarial Review, Edge Case Finder, Stress Testing | Identifies failure modes and weaknesses |
| **Business** | Strategy, Operations, Market Analysis, ROI Evaluation | Assesses feasibility and commercial viability |
| **Science** | Empirical Analysis, Statistical Rigor, Methodology | Applies scientific method to claims |
| **Philosophy** | Ethics, Value Alignment, Long-term Consequences | Examines moral dimensions |
| **Law** | Compliance, Regulatory Analysis, Contract Review | Legal risk and regulatory alignment |
| **Psychology** | Behavioral Analysis, Cognitive Bias Detection | Identifies human factors and biases |
| **Cross-Domain** | Interdisciplinary Synthesis, Meta-Reasoning | Bridges multiple domains |
| **Prompt Engineering** | Prompt Optimization, Chain Construction | Improves query formulation |

You can define custom agents by extending the [`BaseAgent`](src/core/agents/base-agent.ts) class and registering them in the [`AgentRegistry`](src/core/agents/registry.ts).

---

## Synthesis & Consensus

The synthesizer is the engine that transforms multi-agent deliberation into a coherent final response:

1. **Collects all agent thoughts** with confidence scores and domain metadata
2. **Computes weighted thoughts** based on confidence and domain relevance
3. **Detects consensus** when agents converge on similar conclusions
4. **Surfaces disagreement** when experts diverge, preserving transparency
5. **Builds synthesis prompt** incorporating all perspectives, weighted by relevance
6. **Generates final response** that represents the council's collective intelligence

This ensures that the output is not just one agent's opinion, but a **weighted synthesis of multiple expert perspectives** with confidence scoring.

---

## Features

- **Multi-Agent Council** — Orchestrate up to 70 agents across 10+ domains for expert-level deliberation.
- **Real-Time Streaming** — Progressive SSE delivery: early insights → evolving analysis → final comprehensive response.
- **Adaptive Provider Routing** — Automatically route to the most cost-effective and capable provider with failover.
- **Token Budget Governance** — Set spending caps per session with predictive cost estimation before inference.
- **Resilient Execution** — Circuit breakers, retries, and graceful degradation ensure high availability.
- **Persistent Memory** — Cross-session context retention with intelligent query-based memory retrieval.
- **Transparency First** — Surface consensus, disagreement, confidence levels, and individual agent contributions.
- **Modern UI** — Next.js 16 App Router, React 19, Tailwind v4, Radix UI, and Framer Motion animations.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 16.2.3 (App Router) | Full-stack React with server components |
| **UI** | React 19, Tailwind CSS v4, Radix UI, Framer Motion | Modern, accessible, animated interface |
| **State** | Zustand | Lightweight, scalable client state management |
| **Database** | Prisma 7 + better-sqlite3 | Type-safe ORM with persistent memory |
| **Testing** | Jest 30 + Testing Library | Unit and integration test coverage |
| **Language** | TypeScript 5 | End-to-end type safety |

---

## Quick Start

### Prerequisites

- Node.js 20+
- At least one AI provider API key (OpenAI, Anthropic, GLM, or Ollama)

### Installation

```bash
# Clone the repository
git clone https://github.com/amenallahbarkaoui-github/MoE-LLM-Thinking.git
cd MoE-LLM-Thinking

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local and add your API keys

# Initialize database
npx prisma db push

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to explore the interface.

### Provider Setup

The framework supports multiple AI providers out of the box:

| Provider | Config Variable | Models Supported |
|----------|----------------|------------------|
| **OpenAI** | `OPENAI_API_KEY` | GPT-4, GPT-4o, GPT-3.5-turbo |
| **Anthropic** | `ANTHROPIC_API_KEY` | Claude 3.5 Sonnet, Claude 3 Opus |
| **GLM / ZAI** | `GLM_API_KEY` + `GLM_BASE_URL` | GLM-4, GLM-5 series |
| **Ollama** | `OLLAMA_BASE_URL` | Llama, Mistral, self-hosted models |

At least one provider must be configured. Multiple providers enable automatic failover and cost-optimized routing.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run test` | Run Jest test suite |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | ESLint code analysis |

---

## Project Structure

```
src/
├── app/                      # Next.js App Router
│   ├── api/                  # REST API endpoints
│   │   ├── agents/           # Agent management routes
│   │   ├── chat/             # Chat & streaming route
│   │   ├── feedback/         # User feedback collection
│   │   ├── providers/        # Provider configuration
│   │   └── sessions/         # Session persistence
│   ├── chat/                 # Chat interface page
│   └── settings/             # App settings page
├── components/               # React components
│   ├── agents/               # Agent progress & visualization
│   ├── chat/                 # Chat UI (messages, input, history)
│   ├── council/              # Consensus view & reasoning graph
│   ├── effects/              # Visual effects (backgrounds, animations)
│   ├── layout/               # Navbar, page shells
│   └── ui/                   # Reusable UI primitives (Radix)
├── core/                     # Core orchestration logic
│   ├── agents/               # Agent definitions, base class, registry
│   ├── council/              # Consensus engine, adjacency reasoning, synthesis
│   ├── iacp/                 # Inter-Agent Communication Protocol bus
│   ├── providers/            # Provider implementations & registry
│   ├── budget/               # Cost estimation & token tracking
│   ├── concurrency/          # Rate limiting & concurrency control
│   └── memory/               # Context window & session memory
├── stores/                   # Zustand global state
│   ├── chat-store.ts         # Chat session state
│   ├── council-store.ts      # Council deliberation state
│   ├── history-store.ts      # Session history
│   └── settings-store.ts     # User settings
├── types/                    # TypeScript type definitions
│   ├── agent.ts              # Agent domain & configuration types
│   ├── chat.ts               # Chat message & session types
│   ├── council.ts            # Consensus & synthesis types
│   ├── iacp.ts               # IACP message types
│   ├── provider.ts           # Provider configuration types
│   └── sse.ts                # Server-sent events types
├── hooks/                    # React custom hooks
│   └── use-chat.ts           # Chat SSE consumption hook
└── lib/                      # Shared utilities
    ├── cache.ts              # In-memory caching layer
    ├── circuit-breaker.ts    # Fault tolerance pattern
    ├── db.ts                 # Database client
    ├── errors.ts             # Custom error classes
    ├── keyboard-shortcuts.ts # Keyboard interaction handlers
    ├── logger.ts             # Structured logging
    ├── metrics.ts            # Performance metrics
    ├── query-intelligence.ts # Query analysis & routing
    └── utils.ts              # Common utilities
```

---

## Performance Considerations

MoE LLM Thinking is engineered for performance at scale:

| Optimization | Implementation |
|--------------|----------------|
| **Concurrency Control** | Limits concurrent agent invocations to balance throughput and cost |
| **Streaming Delivery** | Progressive synthesis reduces perceived latency by delivering early insights |
| **Context Window Management** | Agents leverage memory and context to avoid redundant processing |
| **Rate Limiting** | Sliding-window rate limiter (100 req/min) with CORS and CSP enforcement |
| **Circuit Breakers** | Automatic failover when providers experience degradation |
| **Horizontal Scaling** | API layer can be horizontally scaled; agent pools can be sharded |
| **Memory Efficiency** | In-memory stores cleaned up at 5-minute intervals to prevent leaks |

---

## Troubleshooting Guide

| Issue | Cause | Solution |
|-------|-------|----------|
| **Query rejected** | Prompt injection pattern detected by safety filters | Rephrase query and retry |
| **429 Too Many Requests** | Rate limit exceeded (100 req/min window) | Wait for reset window; check `Retry-After` header |
| **SSE connection drops** | Network interruption or client doesn't support `ReadableStream` | Ensure modern browser; handle reconnection in client |
| **Provider errors** | Missing or invalid API key in `.env.local` | Verify environment variables; restart dev server |
| **Session save failures** | Database write error (best-effort saving) | Check logs; failure doesn't block UI |
| **Agent not responding** | Provider rate limit or timeout | Check provider status; circuit breaker will trigger failover |

---

## Roadmap

- [x] Multi-agent council with IACP messaging
- [x] Provider abstraction with automatic failover
- [x] Real-time SSE reasoning visualization
- [x] Token budget tracking & cost estimation
- [x] Circuit-breaker resilient execution
- [x] Tree-of-thought & chain-of-thought reasoning
- [x] Confidence scoring & consensus detection
- [ ] WebSocket support for bidirectional agent communication
- [ ] Streaming tool-use / function calling
- [ ] Agent memory with RAG retrieval
- [ ] Docker deployment template
- [ ] Plugin system for custom expert agents
- [ ] Distributed agent pool scaling

---

## License

MIT

---

> **MoE LLM Thinking** — *Where multiple experts think deeper, together.*
