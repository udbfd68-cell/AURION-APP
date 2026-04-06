# Enterprise Prompt Engineering — Best Practices

> Sources: Google "Prompt Engineering Whitepaper v4" (Lee Boonstra, Sep 2024), Anthropic "6 Techniques for Effective Prompt Engineering" (2025)

## Core Principle

Prompt engineering is an **iterative process**. LLMs are prediction engines — they predict the next token based on training data. Your prompt's word-choice, structure, context, style, and tone ALL affect output quality.

## LLM Output Configuration

### Temperature
- **0** = greedy decoding (deterministic) — best for tasks with single correct answer (math, factual)
- **0.1-0.2** = low creativity, high consistency — factual tasks, extraction
- **0.2, top-P 0.95, top-K 30** = balanced starting point
- **0.9, top-P 0.99, top-K 40** = maximum creativity
- Lower temperature → more restrictive and factual
- Higher temperature → more diverse and creative

### Token Length
- More tokens = more compute = higher cost = slower
- Set explicit length in prompt: "Explain in a tweet-length message"
- Reducing max tokens doesn't make the LLM more concise — it just cuts off

## Prompting Techniques (Ranked by Complexity)

### 1. Zero-Shot (Simplest)
Just describe the task. No examples.
```
Classify this review as POSITIVE, NEUTRAL, or NEGATIVE.
Review: "The food was amazing but service was slow."
Sentiment:
```

### 2. One-Shot / Few-Shot (Most Important Best Practice)
Provide 1-5+ examples showing the desired pattern.
```
Example 1: "Technical jargon" → "Plain language"
Example 2: "Technical jargon" → "Plain language"
Now convert: "[your input]"
```
- **Minimum 3-5 examples** for complex tasks
- **Mix up classes** in classification tasks to avoid overfitting to order

### 3. System / Contextual / Role Prompting
- **System prompt**: Overall context and purpose ("You are a senior code reviewer...")
- **Context prompt**: Specific background for current task ("This codebase uses Next.js 16...")
- **Role prompt**: Character/identity ("Explain as an experienced teacher to a 10-year-old")
- Effective styles: Confrontational, Descriptive, Direct, Formal, Humorous, Influential, Informal

### 4. Step-Back Prompting
First ask a general question → feed that answer into the specific task.
```
Step 1: "What are the general principles of secure API design?"
Step 2: "Given those principles, review this specific API route: [code]"
```
Helps mitigate biases by focusing on principles instead of specifics.

### 5. Chain of Thought (CoT)
Generate intermediate reasoning steps before the final answer.
- Simply add: **"Let's think step by step"**
- Combine with few-shot for complex tasks
- Set temperature to **0** for CoT (expect single correct answer)
- Put the answer **AFTER** the reasoning
- More output tokens = higher cost, but much better accuracy

### 6. Self-Consistency
Multiple reasoning paths → majority voting.
1. Run same prompt multiple times (high temperature)
2. Extract answer from each response
3. Choose the most common answer
Best for: complex reasoning where one path might go wrong.

### 7. Tree of Thoughts (ToT)
Explore multiple reasoning paths **simultaneously** (branching tree).
- Each "thought" = intermediate step toward solution
- Model explores different branches
- Evaluates and prunes bad branches
Best for: problems with multiple valid approaches.

### 8. ReAct (Reason + Act)
Combine reasoning with tool use in a thought-action-observation loop:
1. **Think**: Reason about the problem, generate plan
2. **Act**: Execute actions (API calls, search, code execution)
3. **Observe**: Process results
4. **Repeat** until solution reached

### 9. Automatic Prompt Engineering (APE)
Use the LLM to generate and evaluate better prompts:
1. Write a prompt that generates output variants
2. Evaluate all candidates by scoring (BLEU, ROUGE, etc.)
3. Select highest-scoring candidate
4. Iterate

## Anthropic's 6 Techniques

### 1. Provide Context
**Before**: "Tell me about climate change."
**After**: "Explain three major impacts of climate change on agriculture in tropical regions, with examples from the past decade."

### 2. Show Examples of "Good"
Provide 1-2 input→output examples before your actual request.

### 3. Specify Output Constraints
**Before**: "Design me a portfolio website."
**After**: "Create a single-page portfolio with Hero, About, Skills, Portfolio, Experience, Contact sections. Sticky nav, hamburger on mobile, sunset palette, dark/light toggle."

### 4. Break Complex Tasks into Steps
**Before**: "Analyze this sales data."
**After**: "Analyze this data by: 1) Identify top products 2) Compare to previous quarter 3) Highlight unusual patterns 4) Suggest possible reasons"

### 5. Ask It to Think First
"Before answering, think through the problem carefully. Consider different factors, constraints, and approaches before recommending the best solution."

### 6. Define the AI's Role
"Explain how rainbows form from the perspective of an experienced science teacher speaking to a bright 10-year-old."

### BONUS: Ask the AI for Help
"I'm trying to get you to help me with [goal]. Can you help me craft an effective prompt for this?"

## 10 Best Practices (Google Whitepaper)

1. **Provide examples** — THE most important practice (few-shot)
2. **Design with simplicity** — concise, clear, no unnecessary complexity
3. **Be specific about output** — format, length, style, audience
4. **Use instructions over constraints** — tell what TO do, not what NOT to do
5. **Control token length** — set max or request specific length
6. **Use variables** — make prompts reusable with `{variable}` placeholders
7. **Experiment with formats** — question vs statement vs instruction
8. **Mix classes in few-shot** — avoid order bias in classification
9. **Adapt to model updates** — re-test prompts on new model versions
10. **Try structured output** — JSON/XML for non-creative tasks (reduces hallucination)

## Useful Verbs for Prompts
Act, Analyze, Categorize, Classify, Contrast, Compare, Create, Describe, Define, Evaluate, Extract, Find, Generate, Identify, List, Measure, Organize, Parse, Pick, Predict, Provide, Rank, Recommend, Return, Retrieve, Rewrite, Select, Show, Sort, Summarize, Translate, Write

## Prompt Documentation Template
For each prompt attempt, document:
- Name and version
- Goal (one sentence)
- Model name and version
- Configuration (Temperature, Token Limit, Top-K, Top-P)
- Full prompt text
- Output(s) and evaluation

## Code-Specific Prompting
LLMs handle: writing code, explaining code, translating between languages, debugging, reviewing, documenting. For code tasks:
- Provide the language and framework context
- Include relevant type definitions
- Specify coding standards and patterns to follow
- Ask for explanations alongside generated code
