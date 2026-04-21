# MoE LLM Thinking

> **State-of-the-Art Mixture-of-Experts Reasoning Framework for Large Language Models**

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7.7-2D3748?logo=prisma)](https://www.prisma.io/)
[![Jest](https://img.shields.io/badge/Jest-30-C21325?logo=jest)](https://jestjs.io/)

---

## Overview

**MoE LLM Thinking** is a next-generation reasoning framework that implements a **Mixture-of-Experts (MoE)** architecture to orchestrate multiple specialized LLM agents for deep, structured, multi-step cognitive tasks. Unlike single-model inference, MoE LLM Thinking deploys a **council of expert agents** — each optimized for distinct cognitive domains — that collaborate through a dedicated **Inter-Agent Communication Protocol (IACP)** to produce higher-quality, more robust, and verifiably superior reasoning outputs.

Inspired by the latest advances in MoE architectures (e.g., Mixtral 8x22B, GPT-4 sparse routing), this project extends the MoE paradigm from model-internal expert routing to **system-level multi-agent orchestration**, enabling dynamic expert selection, real-time consensus building, and intelligent cost-budget optimization.

---

## Why MoE LLM Thinking?

| Capability | Traditional Single-Model | MoE LLM Thinking |
|------------|-------------------------|------------------|
| **Reasoning Depth** | Limited by single context window | Recursive multi-agent deliberation with consensus |
| **Domain Expertise** | Generalist, no specialization | Dedicated experts: Logic, Creative, Code, Research, Critique |
| **Fault Tolerance** | Single point of failure | Redundant expert validation & circuit-breaker resiliency |
| **Cost Efficiency** | Fixed per-token cost | Dynamic budget allocation & intelligent provider routing |
| **Scalability** | Vertical only | Horizontal expert scaling with concurrency management |
| **Verifiability** | Black-box output | Transparent reasoning graph with adjacency tracking |

---

## Core Architecture

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

### Key Components

- **Agent Registry & Management** — Dynamic registration, health monitoring, and lifecycle management of expert agents.
- **Provider Abstraction Layer** — Universal adapter for OpenAI, Anthropic, Google, and custom providers with automatic failover.
- **IACP Bus** — High-performance inter-agent messaging fabric supporting broadcast, unicast, and consensus patterns.
- **Consensus Engine** — Adjacency-matrix-based reasoning graph with iterative convergence to robust conclusions.
- **Budget & Cost Optimizer** — Real-time token-budget tracking, cost estimation, and intelligent provider selection.
- **Concurrency & Rate Limiting** — Enterprise-grade request throttling with circuit-breaker resilience.
- **Memory Management** — Persistent session memory via Prisma + SQLite with intelligent context retrieval.

---

## Features

- **Multi-Agent Council** — Specialize agents by domain and let them debate, critique, and converge on optimal answers.
- **Real-Time Reasoning Visualization** — Live SSE streams render agent thought processes as interactive reasoning graphs.
- **Adaptive Provider Routing** — Automatically route requests to the most cost-effective and capable provider.
- **Token Budget Governance** — Set spending caps per session with predictive cost estimation before inference.
- **Resilient Execution** — Circuit breakers, retries, and graceful degradation ensure 99.9% uptime.
- **Persistent Memory** — Cross-session context retention with intelligent query-based memory retrieval.
- **Modern UI** — Built with Next.js 16 App Router, React 19 Server Components, Tailwind v4, and Radix UI primitives.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS v4, Radix UI, Framer Motion |
| State | Zustand |
| Database | Prisma 7 + better-sqlite3 |
| Testing | Jest 30 + Testing Library |
| Language | TypeScript 5 |

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/moe-llm-thinking.git
cd moe-llm-thinking

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your API keys

# Initialize database
npx prisma db push

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to explore the interface.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run test` | Run Jest test suite |
| `npm run test:coverage` | Run tests with coverage |
| `npm run lint` | ESLint code analysis |

---

## Project Structure

```
src/
├── app/                 # Next.js App Router (pages & API routes)
├── components/          # React components (chat, council, agents, UI)
├── core/                # Core framework logic
│   ├── agents/          # Agent definitions & base agent class
│   ├── council/         # Consensus engine & adjacency reasoning
│   ├── iacp/            # Inter-Agent Communication Protocol
│   ├── providers/       # AI provider abstraction layer
│   ├── budget/          # Cost estimation & token tracking
│   ├── concurrency/     # Rate limiting & circuit breakers
│   └── memory/          # Session memory & persistence
├── stores/              # Zustand state stores
├── types/               # TypeScript type definitions
└── lib/                 # Utility libraries (cache, logger, errors)
```

---

## License

MIT

---

> **MoE LLM Thinking** — *Where multiple experts think deeper, together.*
