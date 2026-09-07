---
date: 2026-08-23
topic: Conductor-mediated agentic architecture — duplicate, superseded
status: superseded
sources:
  - "2026-08-23-agentic-architecture-pattern.md (canonical consolidated doc)"
models_used_for_research: [z-ai/glm-5.2]
supersedes: none
---

# Agentic Architecture Patterns: The Conductor-Mediated Light Factory Engine
*A comprehensive technical blueprint for open-weight multi-agent orchestration, decoupling the orchestration harness from external runtime interfaces.*

> **Superseded 2026-08-30 (TASK-15):** this file is a near-duplicate of
> `2026-08-23-agentic-architecture-pattern.md` (filename had a typo'd "deisgn").
> Its content is consolidated into the canonical doc; do not read this for current
> guidance.

---

## 1. System Architecture Overview

This design defines a zero-dependency, high-efficiency, multi-agent **Inner Harness** packaged as a reusable setup package (`pip install harness-core`). It abstracts away model assignments, parameter tuning, context isolation, and error management from the user and the **Outer Harness** (e.g., Cursor, Claude Code, customized mobile apps).

The primary architectural paradigm is the **Conductor-Mediated Router Pattern** configured as a **Light Factory Loop**. It treats LLMs as transient, stateless computation units, mapping their underlying hardware strengths directly to specific operational roles.

```
                      [ User Request ]
                             │
                             ▼
               ┌───────────────────────────┐
               │    CONDUCTOR / SCOUT      │
               │ (DeepSeek V4 Flash 0731)  │
               └─────────────┬─────────────┘
                             │ (Dynamically provisions pipeline tasks)
                             ▼
               ┌───────────────────────────┐
               │        RESEARCHER         │
               │        (Kimi K3)          │
               └─────────────┬─────────────┘
                             │ (Contextual Knowledge & Docs)
                             ▼
               ┌───────────────────────────┐
               │     WORKER / BUILDER      │
               │         (GLM 5.2)         │
               └─────────────┬─────────────┘
                             │ (Initial Output Artifacts)
                             ▼
               ┌───────────────────────────┐
               │     QA / REVIEWER 1       │
               │  (DeepSeek V4 Pro 0813)   │
               └─────────────┬─────────────┘
                             │ (Asymmetric logical validation)
                             ▼
               ┌───────────────────────────┐
               │        REVIEWER 2         │
               │       (Qwen 3.8 2T)       │
               └───────────────────────────┘
```

---

## 2. Component Responsibility Matrix

To achieve maximum token efficiency and structural predictability, architectural responsibilities are decoupled between the compiled Python harness code and the non-deterministic open-weight models.

| Responsibility | Managing Layer | Implementation Mechanism (`How`) |
| :--- | :--- | :--- |
| **User Interaction** | Conductor Agent | Interacts with outer interfaces, asks clarifying questions, manages Human-in-the-Loop steps, and provides status notifications. |
| **Pipeline Routing** | Conductor Agent | Parses user tasks against a tool capabilities registry and emits a structured execution matrix (JSON format). |
| **State Tracking** | Harness Orchestrator | Python engine appends execution histories to a local ledger file (`.jsonl`). Models remain stateless. |
| **Fallback & Escalation**| Programmatic Orchestrator | Core package captures execution exceptions or `FAIL` flags from reviewers, updating state and dynamically upgrading the model path. |
| **Token Efficiency** | Payload Constructor | Strips historical bloat and places static blocks (docs, schemas) at the top of the array to match **OpenRouter Prompt Caching** triggers. |

---

## 3. Structural Mapping: Agentic vs. Classical OOP Patterns

Agentic software engineering mirrors classical object-oriented programming (OOP) design patterns, adapting them from deterministic compiled data structures to probabilistic language model boundaries.

### A. Conductor-Mediated Router ───> Mediator & Command Pattern
*   **Classical OOP:** The **Mediator** forces all communication between objects to flow through a centralized router to prevent tight coupling. The **Command** pattern encapsulates an action request as an individual standalone object.
*   **Agentic Implementation:** Worker models (GLM, Kimi) run in complete isolation. They have zero awareness of each other's execution states. The Conductor translates user intent into a clean task block (Command) and dispatches it cleanly to the transient workers.

### B. Light Agent Factory Loop ───> Factory Method & Strategy Pattern
*   **Classical OOP:** The **Factory Method** instantiates object instances dynamically without exposing the internal creation logic to the client code. The **Strategy** pattern modifies an object's operational algorithm at runtime based on external variables.
*   **Agentic Implementation:** The python harness reads the Conductor's execution plan and runs an automated iteration loop. It uses a generic python wrapper class (`AgentInstance`) as a baseline factory object, then dynamically injects specialized system text instructions and custom open-weight routes into it to swap its capability footprint (**Strategy**) on the fly.

### C. Multi-Model Consensus (Reviewers) ───> Chain of Responsibility & Composite Pattern
*   **Classical OOP:** The **Chain of Responsibility** passes a data object along a linear chain of potential processing handlers. The **Composite** pattern groups multiple related objects so they can be interacted with as a single entity interface.
*   **Agentic Implementation:** The core orchestrator pipeline wraps **Reviewer 1** (DeepSeek V4 Pro) and **Reviewer 2** (Qwen 3.8 2T) into a single functional checkpoint boundary. The worker artifact must pass sequentially through both semantic validation blocks before triggering human verification.

---

## 4. Deep-Dive Model Assignment Blueprint

### Conductor & Scout: DeepSeek V4 Flash (`0731`)
*   **Operational Core:** Fast structured instruction tracking, low-latency step planning, and advanced JSON tool-calling capabilities.
*   **Execution Profile:** Acts purely as the supervisor and routing architect. It reads incoming developer inputs, references available system skill registries, splits problems into discrete task matrices, and presents progress checkpoints to the user. It does not perform generation or debugging tasks directly.

### Researcher: Kimi K3
*   **Operational Core:** Elite long-context data extraction and needle-in-a-haystack document ingestion across large token inputs.
*   **Execution Profile:** Provisoned whenever the Conductor flags a task needing large-scale contextual exploration. It ingests massive codebase files, API documentation, or structural system logs, exporting compressed markdown specifications and interface definitions directly into the worker's operational space.

### Worker & Builder: GLM 5.2
*   **Operational Core:** High-throughput repository-scale software engineering, rapid syntax assembly, and code generation loops.
*   **Execution Profile:** Instantiated by the factory to handle the execution workload. It takes the clean technical requirements written by the Researcher and structural plans from the Conductor to output pure source code file blocks, schema definitions, or test code implementations.

### QA / Reviewer 1 (Logical Verification): DeepSeek V4 Pro (`0813`)
*   **Operational Core:** Deep algorithmic reasoning, complex structural mapping, and explicit reasoning-effort tuning parameters.
*   **Execution Profile:** Serves as the primary logic validator. Invoked via OpenRouter utilizing structured provider overrides (`reasoning_effort: max`). It evaluates the Worker’s generation against original constraints, seeking out edge cases, execution bugs, or anti-patterns by executing a full internal step-by-step reasoning cycle before passing code forward.

### Reviewer 2 (Policy, Security, & System Sanity): Qwen 3.8 2T
*   **Operational Core:** Dense architectural cross-examination, high-parameter security policy verification, and comprehensive text synthesis.
*   **Execution Profile:** Performs a secondary, concurrent validation layer. It analyzes the code for broad infrastructural alignment, exception handling, data privacy standards, and code styles. It works in partnership with DeepSeek Pro to guarantee the output is completely secure and stable.

---

## 5. Technical Optimization & Implementation Core

### A. Zero-Data Retention (ZDR) Privacy Enforcement
To maintain total code security within your local development environment, the python provider module forces absolute privacy at the network level by passing a zero-retention metadata header downstream to OpenRouter on every single transactional block:
```python
headers = {
    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
    "HTTP-Referer": "https://github.com/user/harness-core",
    "X-Title": "Agentic Light Factory Core",
    "X-Data-Retention": "none"  # Restricts intermediate data storage
}
```

### B. Token-Efficient Prompt Caching Payload Structure
To achieve up to a 50% drop in prompt token fees and significantly minimize inference latency, payloads must be cleanly structured so that heavy, immutable text constructs are pinned at the top of the messages array. This enables providers like OpenRouter and DeepInfra to read from a cached context buffer.

```python
# Optimal context layout for prompt caching efficiency
messages = [
    # 1. FIXED STATIC SYSTEM DATA (Pinned at top - highly cacheable)
    {"role": "system", "content": "SYSTEM_ROLE_AND_POLICIES_MAX_LENGTH_TEXT"},
    
    # 2. LARGE REFERENCE ATTACHMENTS (Static across development hours)
    {"role": "user", "content": "PROJECT_ARCHITECTURE_SCHEMAS_AND_API_DOCS"},
    
    # 3. APPEND-ONLY HISTORICAL LEDGER (Slow moving context)
    {"role": "user", "content": "HISTORICAL_JSONL_TRANSACTION_ENTRIES"},
    
    # 4. CURRENT VOLATILE QUERY (Appended at the end - invalidates nothing above)
    {"role": "user", "content": "IMMEDIATE_NEW_TASK_INSTRUCTION_OR_LOG_PAYLOAD"}
]
```

### C. Asymmetric Escalation Mechanics
When handling non-deterministic workers, the orchestrator implements a programmatic fallback algorithm. If a fast model (Flash) fails a validation gate or runtime check, the payload is dynamically refactored and passed to a reasoning model (Pro) to repair the output without human interruption.

```python
def execute_asymmetric_step(task_payload):
    # Phase 1: Attempt the cost-effective fast track
    response = call_openrouter(model="deepseek/deepseek-v4-flash", payload=task_payload)
    is_valid, logs = run_programmatic_validation(response)
    
    if is_valid:
        return response
        
    # Phase 2: Asymmetric escalation to heavy reasoning engine on validation failure
    escalated_payload = {
        "model": "deepseek/deepseek-v4-pro-0813",
        "messages": [
            {"role": "system", "content": "You are an expert debugger. Fix this generation code using max reasoning steps."},
            {"role": "user", "content": f"Original Task: {task_payload}"},
            {"role": "user", "content": f"Failed Code Attempt: {response}"},
            {"role": "user", "content": f"Compiler Validation Errors: {logs}"}
        ],
        "provider": {
            "reasoning_effort": "max"  # Engages DeepSeek Pro deep search loop
        }
    }
    return call_openrouter(escalated_payload)
```
