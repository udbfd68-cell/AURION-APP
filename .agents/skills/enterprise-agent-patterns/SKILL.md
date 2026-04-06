# Enterprise Agent Architecture Patterns

> Sources: Google DeepMind "Agents Companion v2" (Feb 2025), OpenAI "Practical Guide to Building Agents" (2025)

## Agent Architecture — 3 Essential Elements

1. **Model**: Central decision-making unit with instruction-based reasoning
2. **Tools**: Bridge internal capabilities to external world (Extensions, Functions, Data stores)
3. **Orchestration layer**: Cyclical process for reasoning, planning, memory, and state management

## AgentOps — Operationalization

AgentOps = DevOps + MLOps + agent-specific concerns:
- **Tool management**: Internal and external tool registry, discovery, versioning
- **Agent brain prompt**: Goal, profile, instructions, orchestration
- **Memory**: Short-term (session/cache) + Long-term (learned patterns, skills, episodes)
- **Task decomposition**: Break complex goals into executable sub-tasks

DevOps → MLOps → FMOps → GenAIOps → AgentOps (each builds on the previous)

## Agent Success Metrics

Track these in order of priority:
1. **Business metrics** (revenue, engagement) — the north star
2. **Goal completion rate** — did the agent achieve its objective?
3. **Critical task success rates** — key milestones within the goal
4. **Application telemetry** — latency, errors, throughput
5. **Human feedback** — thumbs up/down, user surveys, in-context feedback
6. **Trace observability** — log all inner workings for debugging

## Agent Evaluation Framework

### Assessing Agent Capabilities
- Berkeley Function-Calling Leaderboard (BFCL) — tool calling
- τ-bench — common mistakes in tool calling
- PlanBench — planning and reasoning
- AgentBench — holistic end-to-end performance

### Evaluating Trajectory (Steps Taken)
6 automated trajectory evaluation methods:
1. **Exact match** — perfect mirror of ideal solution
2. **In-order match** — expected trajectory with extra steps allowed
3. **Any-order match** — all necessary actions regardless of order
4. **Precision** — how many predicted tool calls are correct?
5. **Recall** — how many essential tool calls are captured?
6. **Single-tool use** — is a specific action in the trajectory?

### Evaluating Final Response
- Does the agent achieve its goals?
- Use an **autorater** (LLM-as-judge) with user-defined criteria
- Human evaluation for subjectivity, context, nuance

### Human-in-the-Loop
- Direct assessment by experts
- Comparative evaluation (vs other agents or iterations)
- User studies with real participants

## Multi-Agent Architecture

### Agent Categories by Function
- **Planner Agents**: Break high-level objectives into sub-tasks
- **Retriever Agents**: Fetch relevant data from external sources
- **Execution Agents**: Perform computations, generate responses, call APIs
- **Evaluator Agents**: Monitor and validate responses for coherence

### Multi-Agent Design Patterns

| Pattern | Description | When to Use |
|---|---|---|
| **Sequential** | Assembly line — each agent passes output to next | Linear workflows |
| **Hierarchical** | Manager coordinates worker agents | Complex task delegation |
| **Collaborative** | Agents share info and resources as peers | Research, multi-expertise tasks |
| **Competitive** | Agents compete for best outcome | Quality optimization |
| **Diamond** | Hierarchical + moderation layer before user | User-facing with quality control |
| **Peer-to-Peer** | Agents hand off to each other on misrouting | Resilient classification |
| **Adaptive Loop** | Iterative refinement until criteria met | Search, optimization |
| **Response Mixer** | Combines elements from multiple agent responses | Multi-expertise queries |

### Important Agent Components
1. **Interaction Wrapper** — interface between agent and environment
2. **Memory Management** — short-term working + long-term storage + "reflection"
3. **Cognitive Functionality** — CoT, ReAct, planning, self-correction
4. **Tool Integration** — dynamic tool registries, "Tool RAG"
5. **Flow/Routing** — connections with other agents, dynamic discovery
6. **Feedback Loops** — continuous learning from interaction outcomes
7. **Agent Communication** — structured messaging between agents
8. **Agent & Tool Registry (Mesh)** — discovery, administration, ontology, performance metrics

### Challenges in Multi-Agent Systems
- Task communication (messages vs structured async tasks)
- Task allocation efficiency
- Coordinating reasoning/debate between agents
- Managing context across agents
- Time and cost of multi-agent interactions
- System complexity scaling

## OpenAI Orchestration Patterns

### Single-Agent Systems
- Start with one agent, incrementally add tools
- Implement a "run" loop with exit conditions
- Only split when: complex logic with many conditionals, or tool overload

### Multi-Agent Patterns (OpenAI)

**Manager Pattern** (agents as tools):
- Central "manager" LLM coordinates specialized agents via tool calls
- Manager retains context and control, synthesizes results
- Best when one agent should control workflow and user access

**Decentralized Pattern** (handoff):
- Agents as peers, one-way handoff transfers control
- Conversation state transfers with the handoff
- Best for peer-level specialization

## From Agents to Contractors

For high-stakes complex tasks, evolve from simple agent interfaces to **contract-adhering agents**:

### Contract Data Model
- **Task/Project description** [Required] — detailed expected outcomes
- **Deliverables & Specifications** [Required] — what makes deliverable acceptable
- **Scope** [Optional] — boundaries of responsibility
- **Expected Cost** [Required] — budget expectations
- **Expected Duration** [Required] — timeline expectations
- **Input Sources** [Optional] — what data can be used
- **Reporting & Feedback** [Required] — update frequency and mechanism

### Contract Lifecycle
1. **Define** — precise outcomes, deliverables, specifications
2. **Negotiate** — clarify ambiguities, refine scope
3. **Execute** — perform with ongoing feedback
4. **Feedback** — resolve ambiguities early
5. **Subcontracts** — decompose complex tasks into smaller ones

## Automotive AI Example (Real-World Multi-Agent)

Specialized agents: Navigation, Media Search, Message Composition, Car Manual (RAG), General Knowledge

Patterns used:
- **Hierarchical**: Orchestrator classifies → routes to specialist
- **Diamond**: Specialist → Rephraser Agent → user (adjusts tone, length, personalization)
- **Peer-to-Peer**: Agents detect misrouting and hand off to correct peer
- **Collaborative**: Response Mixer combines multiple agent responses
- **Adaptive Loop**: Auto-reformulates queries on unsatisfactory results

## Agentic RAG (vs Traditional RAG)

Traditional RAG = static retrieve → feed to LLM. Fails on ambiguous/multi-step queries.

Agentic RAG improvements:
- **Context-Aware Query Expansion**: Multiple query refinements per retrieval
- **Multi-Step Reasoning**: Decompose complex queries, retrieve sequentially
- **Adaptive Source Selection**: Dynamically select best knowledge sources
- **Validation & Correction**: Cross-check for hallucinations before integration

Better Search = Better RAG:
1. Parse & chunk documents properly (handle complex layouts, tables, images)
2. Add metadata to chunks (synonyms, keywords, authors, dates, tags)
3. Fine-tune embedding model or add search adaptor
4. Use faster vector database
5. Use a ranker (re-rank dozens/hundreds of results)
6. Implement check grounding (ensure each phrase is citable)

## Key Takeaways for Implementation

1. **Start single-agent** — only split when complexity demands it
2. **Instrument everything** — traces, metrics, human feedback
3. **Automate evaluation** — don't rely solely on manual testing
4. **Human-in-the-loop** for subjective aspects and safety
5. **Build tool/agent registries** as the system grows
6. **Security is paramount** in enterprise deployments
7. **Contracts > simple prompts** for high-stakes tasks
8. **Agentic RAG > static RAG** for complex queries
