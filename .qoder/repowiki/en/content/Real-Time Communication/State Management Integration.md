# State Management Integration

<cite>
**Referenced Files in This Document**
- [council-store.ts](file://src/stores/council-store.ts)
- [chat-store.ts](file://src/stores/chat-store.ts)
- [history-store.ts](file://src/stores/history-store.ts)
- [use-chat.ts](file://src/hooks/use-chat.ts)
- [page.tsx](file://src/app/chat/page.tsx)
- [route.ts](file://src/app/api/chat/route.ts)
- [route.ts](file://src/app/api/sessions/route.ts)
- [chat-area.tsx](file://src/components/chat/chat-area.tsx)
- [agent-progress-panel.tsx](file://src/components/agents/agent-progress-panel.tsx)
- [reasoning-graph.tsx](file://src/components/council/reasoning-graph.tsx)
- [chat-input.tsx](file://src/components/chat/chat-input.tsx)
- [sse.ts](file://src/types/sse.ts)
- [council.ts](file://src/types/council.ts)
- [chat.ts](file://src/types/chat.ts)
- [iacp.ts](file://src/types/iacp.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)
10. [Appendices](#appendices)

## Introduction
This document explains the Zustand-based state management integration that powers real-time multi-agent coordination and chat experiences. It covers:
- The council store for managing multi-agent coordination state (progress tracking, discussion status, synthesis results)
- The chat store for handling message streams, user input state, and conversation history
- The history store for persisting conversation data and enabling session replay
- The event processing pipeline transforming SSE events into state updates and UI synchronization
- Performance optimization techniques, memory management, and persistence strategies
- Store usage patterns, event handlers, and React component integrations

## Project Structure
The state management stack is organized around three Zustand stores and a cohesive SSE-driven pipeline:
- Stores: council-store, chat-store, history-store
- Hooks: use-chat orchestrates SSE streaming and integrates stores
- UI: chat page and components subscribe to stores for live updates
- API: server-side routes emit structured SSE events and manage session persistence

```mermaid
graph TB
subgraph "UI Layer"
Page["Chat Page<br/>page.tsx"]
ChatArea["Chat Area<br/>chat-area.tsx"]
AgentPanel["Agent Progress Panel<br/>agent-progress-panel.tsx"]
Reasoning["Reasoning Graph<br/>reasoning-graph.tsx"]
ChatInput["Chat Input<br/>chat-input.tsx"]
end
subgraph "State Layer"
UseChat["Hook: useChat<br/>use-chat.ts"]
CouncilStore["Council Store<br/>council-store.ts"]
ChatStore["Chat Store<br/>chat-store.ts"]
HistoryStore["History Store<br/>history-store.ts"]
end
subgraph "API Layer"
ChatRoute["API: /api/chat<br/>route.ts"]
SessionsRoute["API: /api/sessions<br/>route.ts"]
end
subgraph "Types"
SSE["SSE Types<br/>sse.ts"]
TypesCouncil["Council Types<br/>council.ts"]
TypesChat["Chat Types<br/>chat.ts"]
TypesIACP["IACP Types<br/>iacp.ts"]
end
Page --> ChatArea
Page --> AgentPanel
Page --> Reasoning
Page --> ChatInput
ChatArea --> UseChat
AgentPanel --> CouncilStore
Reasoning --> CouncilStore
ChatInput --> UseChat
UseChat --> CouncilStore
UseChat --> ChatStore
UseChat --> ChatRoute
ChatRoute --> SSE
ChatRoute --> TypesCouncil
ChatRoute --> TypesChat
ChatRoute --> TypesIACP
ChatStore --> SessionsRoute
HistoryStore --> SessionsRoute
```

**Diagram sources**
- [page.tsx:1-368](file://src/app/chat/page.tsx#L1-L368)
- [chat-area.tsx:1-332](file://src/components/chat/chat-area.tsx#L1-L332)
- [agent-progress-panel.tsx:1-583](file://src/components/agents/agent-progress-panel.tsx#L1-L583)
- [reasoning-graph.tsx:1-258](file://src/components/council/reasoning-graph.tsx#L1-L258)
- [chat-input.tsx:1-86](file://src/components/chat/chat-input.tsx#L1-L86)
- [use-chat.ts:1-158](file://src/hooks/use-chat.ts#L1-L158)
- [council-store.ts:1-188](file://src/stores/council-store.ts#L1-L188)
- [chat-store.ts:1-132](file://src/stores/chat-store.ts#L1-L132)
- [history-store.ts:1-108](file://src/stores/history-store.ts#L1-L108)
- [route.ts:1-222](file://src/app/api/chat/route.ts#L1-L222)
- [route.ts:1-91](file://src/app/api/sessions/route.ts#L1-L91)
- [sse.ts:1-112](file://src/types/sse.ts#L1-L112)
- [council.ts:1-114](file://src/types/council.ts#L1-L114)
- [chat.ts:1-10](file://src/types/chat.ts#L1-L10)
- [iacp.ts:1-67](file://src/types/iacp.ts#L1-L67)

**Section sources**
- [page.tsx:1-368](file://src/app/chat/page.tsx#L1-L368)
- [use-chat.ts:1-158](file://src/hooks/use-chat.ts#L1-L158)
- [council-store.ts:1-188](file://src/stores/council-store.ts#L1-L188)
- [chat-store.ts:1-132](file://src/stores/chat-store.ts#L1-L132)
- [history-store.ts:1-108](file://src/stores/history-store.ts#L1-L108)
- [route.ts:1-222](file://src/app/api/chat/route.ts#L1-L222)
- [route.ts:1-91](file://src/app/api/sessions/route.ts#L1-L91)
- [sse.ts:1-112](file://src/types/sse.ts#L1-L112)
- [council.ts:1-114](file://src/types/council.ts#L1-L114)
- [chat.ts:1-10](file://src/types/chat.ts#L1-L10)
- [iacp.ts:1-67](file://src/types/iacp.ts#L1-L67)

## Core Components
- Council Store: Central state for multi-agent coordination lifecycle, agent progress, IACP messages, and synthesis results. Exposes a single event handler to normalize and apply SSE events.
- Chat Store: Manages UI chat messages, loading state, current session ID, and persistence actions for saving/loading sessions.
- History Store: Fetches paginated sessions, supports deletion, and exposes helpers to locate sessions by ID.

Key responsibilities:
- Normalize SSE event types into deterministic state transitions
- Mutate immutable state efficiently using functional updates
- Persist and load conversation sessions via API routes
- Provide reactive UI bindings through React components

**Section sources**
- [council-store.ts:1-188](file://src/stores/council-store.ts#L1-L188)
- [chat-store.ts:1-132](file://src/stores/chat-store.ts#L1-L132)
- [history-store.ts:1-108](file://src/stores/history-store.ts#L1-L108)

## Architecture Overview
The system uses a unidirectional data flow:
- Client initiates a chat request via the hook
- Server emits structured SSE events
- Hook parses and dispatches events to the council store
- UI components subscribe to stores and re-render reactively
- Chat store persists session state; history store manages session listings

```mermaid
sequenceDiagram
participant User as "User"
participant UI as "Chat Page<br/>page.tsx"
participant Hook as "useChat<br/>use-chat.ts"
participant API as "API /api/chat<br/>route.ts"
participant SSE as "Server-Sent Events"
participant CS as "Council Store<br/>council-store.ts"
participant CHS as "Chat Store<br/>chat-store.ts"
User->>UI : "Submit query"
UI->>Hook : "sendMessage(query)"
Hook->>API : "POST /api/chat"
API-->>SSE : "Start SSE stream"
loop "Read stream"
SSE-->>Hook : "event : type, data"
Hook->>CS : "handleSSEEvent(type, data)"
CS-->>UI : "Re-render components"
alt "Complete"
Hook->>CHS : "updateLastCouncilMessage(response)"
Hook->>CHS : "saveCurrentSession()"
end
end
```

**Diagram sources**
- [use-chat.ts:22-128](file://src/hooks/use-chat.ts#L22-L128)
- [route.ts:88-222](file://src/app/api/chat/route.ts#L88-L222)
- [council-store.ts:54-171](file://src/stores/council-store.ts#L54-L171)
- [chat-store.ts:26-130](file://src/stores/chat-store.ts#L26-L130)

**Section sources**
- [use-chat.ts:1-158](file://src/hooks/use-chat.ts#L1-L158)
- [route.ts:1-222](file://src/app/api/chat/route.ts#L1-L222)
- [council-store.ts:1-188](file://src/stores/council-store.ts#L1-L188)
- [chat-store.ts:1-132](file://src/stores/chat-store.ts#L1-L132)

## Detailed Component Analysis

### Council Store: Multi-Agent Coordination State
The council store encapsulates the entire lifecycle of multi-agent reasoning:
- Lifecycle: idle → analyzing → selecting → thinking → discussing → synthesizing → complete/error
- Agent tracking: per-agent status, thoughts, confidence, processing time, branching
- IACP messaging: threaded discussion records
- Final synthesis: response, timing, totals, and optional token usage

State mutations are pure and idempotent, keyed by SSE event types. The store exposes:
- handleSSEEvent(eventType, data): central dispatcher
- reset(): clears state to idle

```mermaid
flowchart TD
Start(["SSE Event"]) --> Type{"Event Type"}
Type --> |council:start| Init["Reset state<br/>status=analyzing"]
Type --> |council:analysis| Analysis["Set analysis<br/>status=selecting"]
Type --> |council:selecting| Selecting["Set selection<br/>status=thinking"]
Type --> |agent:activated| Activate["Add agent record<br/>agentsActivated++"]
Type --> |agent:thinking| Thinking["Mark agent thinking"]
Type --> |agent:thought| Thought["Mark agent complete<br/>agentsSucceeded++"]
Type --> |agent:error| AgentErr["Mark agent error"]
Type --> |iacp:message| IACP["Append IACP message<br/>status=discussing"]
Type --> |council:synthesizing| SynStart["status=synthesizing"]
Type --> |council:complete| Complete["status=complete<br/>finalResponse,totalTime,counts"]
Type --> |council:error| CErr["status=error,error"]
Init --> End(["State Updated"])
Analysis --> End
Selecting --> End
Activate --> End
Thinking --> End
Thought --> End
AgentErr --> End
IACP --> End
SynStart --> End
Complete --> End
CErr --> End
```

**Diagram sources**
- [council-store.ts:54-171](file://src/stores/council-store.ts#L54-L171)

**Section sources**
- [council-store.ts:1-188](file://src/stores/council-store.ts#L1-L188)
- [sse.ts:6-112](file://src/types/sse.ts#L6-L112)

### Chat Store: Message Streams and Session Persistence
Responsibilities:
- Manage UI messages and loading state
- Append user and placeholder council messages
- Update the last council message as responses stream
- Save/load sessions via API endpoints

Persistence behavior:
- Creates a session on first response if none exists
- Updates existing session on subsequent saves
- Best-effort persistence: failures are logged and do not block UI

```mermaid
sequenceDiagram
participant Hook as "useChat<br/>use-chat.ts"
participant CS as "Chat Store<br/>chat-store.ts"
participant API as "API /api/sessions<br/>route.ts"
Hook->>CS : "addMessage(user)"
Hook->>CS : "addMessage(council placeholder)"
Hook->>API : "POST /api/sessions (create)"
API-->>Hook : "{id}"
Hook->>CS : "setCurrentSessionId(id)"
Hook->>CS : "updateLastCouncilMessage(content)"
Hook->>API : "PATCH /api/sessions/ : id (update)"
```

**Diagram sources**
- [use-chat.ts:22-128](file://src/hooks/use-chat.ts#L22-L128)
- [chat-store.ts:23-130](file://src/stores/chat-store.ts#L23-L130)
- [route.ts:37-91](file://src/app/api/sessions/route.ts#L37-L91)

**Section sources**
- [chat-store.ts:1-132](file://src/stores/chat-store.ts#L1-L132)
- [route.ts:1-91](file://src/app/api/sessions/route.ts#L1-L91)

### History Store: Session Listing and Deletion
Responsibilities:
- Paginate and filter sessions
- Delete single or multiple sessions
- Track loading state and total counts

```mermaid
flowchart TD
Load["fetchSessions(page, search)"] --> CallAPI["GET /api/sessions?page&limit&search"]
CallAPI --> Ok{"HTTP 200?"}
Ok --> |Yes| Update["Update sessions,total,count"]
Ok --> |No| Log["Log error"]
DelOne["deleteSession(id)"] --> APIDel["DELETE /api/sessions/:id"]
DelMany["deleteSessions(ids)"] --> APIMany["DELETE /api/sessions (body.ids)"]
APIDel --> UpdateDel["Remove from list"]
APIMany --> UpdateDel
```

**Diagram sources**
- [history-store.ts:37-98](file://src/stores/history-store.ts#L37-L98)
- [route.ts:4-35](file://src/app/api/sessions/route.ts#L4-L35)

**Section sources**
- [history-store.ts:1-108](file://src/stores/history-store.ts#L1-L108)
- [route.ts:1-91](file://src/app/api/sessions/route.ts#L1-L91)

### Event Processing Pipeline: SSE Normalization and UI Sync
End-to-end flow:
- Server emits structured SSE events with typed payloads
- Client reads stream line-by-line, buffers partial chunks, splits on newlines
- For each event/data pair, the hook invokes the council store’s event handler
- UI components re-render based on store subscriptions
- On completion, the last council message is finalized and session is saved

```mermaid
sequenceDiagram
participant API as "Server<br/>route.ts"
participant Reader as "Stream Reader<br/>use-chat.ts"
participant Parser as "Line Parser"
participant CS as "Council Store<br/>council-store.ts"
participant UI as "Components"
API-->>Reader : "event : council : start"
API-->>Reader : "data : {...}"
Reader->>Parser : "buffer += chunk"
Parser-->>Reader : "lines[]"
Reader->>CS : "handleSSEEvent('council : start', payload)"
CS-->>UI : "Re-render"
API-->>Reader : "event : agent : activated/data"
Reader->>CS : "handleSSEEvent(...)"
CS-->>UI : "Re-render"
API-->>Reader : "event : council : complete/data"
Reader->>CS : "handleSSEEvent('council : complete', payload)"
Reader->>UI : "Finalize message + auto-save"
```

**Diagram sources**
- [route.ts:148-222](file://src/app/api/chat/route.ts#L148-L222)
- [use-chat.ts:74-128](file://src/hooks/use-chat.ts#L74-L128)
- [council-store.ts:54-171](file://src/stores/council-store.ts#L54-L171)

**Section sources**
- [use-chat.ts:1-158](file://src/hooks/use-chat.ts#L1-L158)
- [route.ts:1-222](file://src/app/api/chat/route.ts#L1-L222)
- [council-store.ts:1-188](file://src/stores/council-store.ts#L1-L188)

### UI Integration Patterns
- Chat Page composes panels and binds actions from the hook
- Agent Progress Panel subscribes to council store for agent lists and IACP messages
- Chat Area listens for clarification and cache-hit events, and displays summaries
- Reasoning Graph builds visualization data from agent state
- Chat Input handles user submission and loading states

```mermaid
graph TB
Page["page.tsx"] --> Hook["use-chat.ts"]
Hook --> CS["council-store.ts"]
Hook --> CHS["chat-store.ts"]
Page --> AgentPanel["agent-progress-panel.tsx"]
Page --> ChatArea["chat-area.tsx"]
Page --> Reasoning["reasoning-graph.tsx"]
Page --> ChatInput["chat-input.tsx"]
AgentPanel --> CS
ChatArea --> CS
Reasoning --> CS
ChatInput --> Hook
```

**Diagram sources**
- [page.tsx:1-368](file://src/app/chat/page.tsx#L1-L368)
- [agent-progress-panel.tsx:1-583](file://src/components/agents/agent-progress-panel.tsx#L1-L583)
- [chat-area.tsx:1-332](file://src/components/chat/chat-area.tsx#L1-L332)
- [reasoning-graph.tsx:1-258](file://src/components/council/reasoning-graph.tsx#L1-L258)
- [chat-input.tsx:1-86](file://src/components/chat/chat-input.tsx#L1-L86)
- [use-chat.ts:1-158](file://src/hooks/use-chat.ts#L1-L158)
- [council-store.ts:1-188](file://src/stores/council-store.ts#L1-L188)
- [chat-store.ts:1-132](file://src/stores/chat-store.ts#L1-L132)

**Section sources**
- [page.tsx:1-368](file://src/app/chat/page.tsx#L1-L368)
- [agent-progress-panel.tsx:1-583](file://src/components/agents/agent-progress-panel.tsx#L1-L583)
- [chat-area.tsx:1-332](file://src/components/chat/chat-area.tsx#L1-L332)
- [reasoning-graph.tsx:1-258](file://src/components/council/reasoning-graph.tsx#L1-L258)
- [chat-input.tsx:1-86](file://src/components/chat/chat-input.tsx#L1-L86)

## Dependency Analysis
Stores and components exhibit low coupling and high cohesion:
- UI components depend on stores via hooks and direct state selectors
- The hook acts as a thin orchestration layer between UI and stores
- API routes are decoupled from UI and only emit standardized SSE events
- Types define a contract for event payloads and state shapes

```mermaid
graph LR
UI["UI Components"] --> Hook["use-chat.ts"]
Hook --> CS["council-store.ts"]
Hook --> CHS["chat-store.ts"]
CS --> Types["sse.ts / council.ts / iacp.ts"]
CHS --> Types
History["history-store.ts"] --> Types
Hook --> API["/api/chat route.ts"]
API --> Types
```

**Diagram sources**
- [use-chat.ts:1-158](file://src/hooks/use-chat.ts#L1-L158)
- [council-store.ts:1-188](file://src/stores/council-store.ts#L1-L188)
- [chat-store.ts:1-132](file://src/stores/chat-store.ts#L1-L132)
- [history-store.ts:1-108](file://src/stores/history-store.ts#L1-L108)
- [route.ts:1-222](file://src/app/api/chat/route.ts#L1-L222)
- [sse.ts:1-112](file://src/types/sse.ts#L1-L112)
- [council.ts:1-114](file://src/types/council.ts#L1-L114)
- [iacp.ts:1-67](file://src/types/iacp.ts#L1-L67)

**Section sources**
- [use-chat.ts:1-158](file://src/hooks/use-chat.ts#L1-L158)
- [council-store.ts:1-188](file://src/stores/council-store.ts#L1-L188)
- [chat-store.ts:1-132](file://src/stores/chat-store.ts#L1-L132)
- [history-store.ts:1-108](file://src/stores/history-store.ts#L1-L108)
- [route.ts:1-222](file://src/app/api/chat/route.ts#L1-L222)
- [sse.ts:1-112](file://src/types/sse.ts#L1-L112)
- [council.ts:1-114](file://src/types/council.ts#L1-L114)
- [iacp.ts:1-67](file://src/types/iacp.ts#L1-L67)

## Performance Considerations
- Efficient state updates: Zustand’s functional updates avoid unnecessary renders by returning shallowly equal objects when unchanged
- Streaming parsing: Line-buffered decoding prevents partial event loss and reduces memory churn
- Minimal re-renders: Components subscribe to narrow slices of state (e.g., agents vs. messages)
- Best-effort persistence: Session save operations do not block UI; errors are logged and ignored to maintain responsiveness
- UI animations: Motion components use initial/animated transitions to avoid heavy computations during rapid updates

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and remedies:
- Malformed SSE data: The parser skips malformed lines and continues processing
- Aborted requests: Stop generation cancels the fetch and resets loading state
- Session save failures: Errors are caught and logged; UI remains usable
- Empty or sanitized queries: Server validates and sanitizes input, returning explicit errors

**Section sources**
- [use-chat.ts:113-126](file://src/hooks/use-chat.ts#L113-L126)
- [route.ts:113-138](file://src/app/api/chat/route.ts#L113-L138)
- [chat-store.ts:126-130](file://src/stores/chat-store.ts#L126-L130)

## Conclusion
The Zustand-based state management delivers a clean, scalable foundation for real-time multi-agent coordination:
- Clear separation of concerns across stores, hooks, and UI
- Robust SSE event normalization and UI synchronization
- Practical persistence and history management
- Optimized rendering and resilience against transient failures

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### Store Usage Patterns
- Initialize a new session: add user message, add placeholder council message, set loading, reset council store
- Handle SSE events: dispatch to council store’s event handler; on completion, finalize last council message and save session
- Load a session: fetch from API and hydrate chat store; reset council store

**Section sources**
- [use-chat.ts:22-128](file://src/hooks/use-chat.ts#L22-L128)
- [chat-store.ts:44-78](file://src/stores/chat-store.ts#L44-L78)
- [council-store.ts:54-171](file://src/stores/council-store.ts#L54-L171)

### Event Handlers and Contracts
- SSE event types and payloads are defined centrally and consumed by the store dispatcher
- UI components attach lightweight wrappers to capture auxiliary UI signals (e.g., budget warnings, cache hits)

**Section sources**
- [sse.ts:6-112](file://src/types/sse.ts#L6-L112)
- [chat-area.tsx:114-138](file://src/components/chat/chat-area.tsx#L114-L138)