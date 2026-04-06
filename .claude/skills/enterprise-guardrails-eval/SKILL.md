# Enterprise Guardrails, Evaluation & Safety

> Sources: OpenAI "Practical Guide to Building Agents" (2025), Google "Agents Companion v2" (Feb 2025)

## Guardrails — Layered Defense

No single guardrail provides sufficient protection. Use **multiple specialized guardrails** together.

### Types of Guardrails

| Type | Purpose | Implementation |
|---|---|---|
| **Relevance classifier** | Flag off-topic queries | LLM-based classifier checking scope |
| **Safety classifier** | Detect jailbreaks/prompt injections | Input validation model |
| **PII filter** | Prevent PII exposure | Regex + NER on outputs |
| **Moderation** | Flag hate/harassment/violence | Content classifier on inputs |
| **Tool safeguards** | Risk-rate each tool | Low/Medium/High based on reversibility, permissions, financial impact |
| **Rules-based** | Block known threats | Blocklists, input length limits, regex filters |
| **Output validation** | Ensure brand alignment | Prompt engineering + content checks |

### Tool Risk Assessment
Rate every tool the agent can access:
- **Low risk**: Read-only, no side effects (fetch data, search)
- **Medium risk**: Write access but reversible (update record, create draft)
- **High risk**: Irreversible or financial impact (send email, process payment, delete data)

High-risk actions should require:
- Human approval
- Additional confirmation steps
- Audit logging
- Rate limiting

### Building Guardrails — Heuristic
1. Start with data privacy and content safety
2. Add guardrails based on real-world edge cases and failures
3. Optimize for both security AND user experience
4. Iterate as your agent evolves

## Evaluation Framework

### Three Levels of Evaluation

**Level 1 — Agent Capabilities**
- Can it understand instructions correctly?
- Can it reason logically?
- Can it use tools appropriately?
- Benchmark with public leaderboards (BFCL, τ-bench, PlanBench, AgentBench)

**Level 2 — Trajectory (Steps Taken)**
- Did it take the right steps?
- Were the tool calls correct and efficient?
- 6 metrics: Exact match, In-order match, Any-order match, Precision, Recall, Single-tool use

**Level 3 — Final Response**
- Does the output achieve the goal?
- Is it accurate, relevant, correct?
- Use an **autorater** (LLM-as-judge) with defined criteria

### Human-in-the-Loop Evaluation
Essential because humans can evaluate:
- **Subjectivity**: Creativity, common sense, nuance
- **Context**: Broader implications of agent actions
- **Iterative improvement**: Rich feedback for refinement
- **Evaluator calibration**: Tune autoraters against human judgment

Methods: Direct assessment, comparative evaluation, user studies

### Evaluation Method Comparison

| Method | Strengths | Weaknesses |
|---|---|---|
| **Human** | Captures nuance, considers human factors | Subjective, expensive, doesn't scale |
| **LLM-as-Judge** | Scalable, efficient, consistent | May miss intermediate steps, limited by LLM |
| **Automated Metrics** | Objective, scalable, efficient | May not capture full capabilities, gameable |

## Success Metrics

### Metric Hierarchy
1. **Business KPIs** (north star) — revenue, engagement, conversion
2. **Goal completion rate** — agent achieves its objective
3. **Critical task success** — key milestones completed
4. **Application telemetry** — latency, errors, throughput
5. **Human feedback** — 👍👎, surveys, in-context feedback
6. **Trace/observability** — full audit trail of agent decisions

### Multi-Agent Metrics (Additional)
- **Cooperation & Coordination**: How well do agents work together?
- **Planning & Task Assignment**: Right plan? Did we stick to it?
- **Agent Utilization**: How effectively do agents select the right peer?
- **Scalability**: Does quality improve as more agents are added?

## Human Intervention Design

### When to Escalate to Human
1. **Exceeding failure thresholds**: Set limits on retries/actions; escalate when exceeded
2. **High-risk actions**: Sensitive, irreversible, or high-stakes operations

### Intervention Principles
- Critical early in deployment — helps identify failures and edge cases
- Builds evaluation feedback cycle
- Confidence grows → reduce frequency over time
- Always maintain the option for user to regain control

## Enterprise Security (OpenAI)

- **Data ownership**: Enterprise retains full ownership
- **Encryption**: In transit and at rest (SOC 2 Type 2, CSA STAR)
- **Access controls**: Granular, role-based (who sees/manages data)
- **Flexible retention**: Adjust logging/storage to organizational policies
- **Model isolation**: Training data isolation from customer data

## Practical Guardrail Checklist for Aurion Studio

### Input Guardrails
- [ ] Zod validation on all API inputs ✅ (already done)
- [ ] Input length limits on user prompts
- [ ] Rate limiting per user/IP ✅ (already done, but in-memory)
- [ ] CSRF origin check ✅ (already done)
- [ ] Sanitize HTML inputs ✅ (already done)

### Output Guardrails
- [ ] Sanitize generated code before preview ✅ (sanitizeForPreview)
- [ ] CSP headers for preview iframe
- [ ] Output length limits on AI responses
- [ ] Content moderation on generated output

### Tool Guardrails
- [ ] Risk-rate all 46 API routes (read-only vs write vs deploy)
- [ ] Human confirmation for deploy actions
- [ ] Audit logging for sensitive operations
- [ ] API key rotation strategy

### Evaluation
- [ ] Automated tests for API routes ✅ (201 tests)
- [ ] E2E tests with Playwright (TODO)
- [ ] Goal completion tracking for generated apps
- [ ] User feedback mechanism (thumbs up/down)
- [ ] Error tracing and observability
