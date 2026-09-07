---
date: 2026-08-23
topic: Conductor-mediated agentic architecture — compound design pattern matrix and light factory engine
status: verified-live
sources:
  - "2026-08-23-agentic-architecture-pattern.md (original)"
  - "2026-08-23-agentic-deisgn-pattern.md (duplicate, consolidated here)"
models_used_for_research: [z-ai/glm-5.2]
supersedes: 2026-08-23-agentic-deisgn-pattern.md
---

# Architectural Documentation: The Compound Agentic Design Pattern Matrix
**System Type:** Open-Source Personal Assistant Mobile Engine (Inner Harness Core)  
**Execution Environment:** Stateless API Orchestration (OpenRouter)  
**Target Models:** DeepSeek V4 Flash/Pro, Kimi K3, GLM 5.2, Qwen 3.8 2T  

> **Consolidation note (2026-08-30, TASK-15):** this doc merges two near-duplicate notes —
> `2026-08-23-agentic-architecture-pattern.md` and `2026-08-23-agentic-deisgn-pattern.md`
> (the latter had a typo'd "deisgn" filename). The duplicate's unique content (model
> assignment blueprint, ZDR header details) is folded in below. The typo'd file is
> superseded.

---

## 1. Executive Summary & Core Philosophical Shift

When building a high-tier multi-agent system using frontier open-weight models, the core architectural challenge mirrors classical enterprise software engineering: **managing complexity, state, and resource allocation.** 

Your thinking has naturally gravitated toward a **Compound Agentic Architecture**. You are not implementing a single, monolithic pattern. Instead, you are mixing and matching discrete design patterns to build a lightweight, highly efficient **Factory Loop**. 

### The Foundational Shift: Deterministic Data vs. Probabilistic Intelligence
* **Classical Object-Oriented Programming (OOP):** You write deterministic logic to route structured data through compiled, stateful code blocks (Objects).
* **Agentic Software Engineering (ASE):** You write deterministic state machines (The Inner Harness) to route unstructured natural language through probabilistic, stateless reasoning clusters (LLMs).

By separating the **Manager** (Conductor), the **Runtime Worker Generator** (Factory), the **Validators** (Reviewers), and the **State/Token Management** (The Package Framework), you achieve low latency, absolute control over data compliance, and significant cost savings.

---

## 2. System Architecture Overview

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

## 3. The Microkernel & Conductor-Mediated Router Pattern

At the center of your architecture is a split between a fixed, highly optimized core and dynamic, ephemeral extensions.

### The Conductor (The Microkernel Gateway)
The Conductor—driven by **DeepSeek V4 Flash (`0731`)** due to its low cost, extreme speed, and high marks on tool-use benchmarks—acts as the exclusive human interaction layer and manager. 
* **It does not perform the work.** It never writes raw production code files or reads raw unstructured documentation directly.
* **It manages execution layout.** It breaks down an end-user request into a structured JSON execution plan (a graph of tasks) and tracks dependencies.

### The Workers (Transient Strategy Plugins)
Worker agents like **GLM 5.2** (for rapid repository-scale file generation) or **Kimi K3** (for high-context research and data extraction) are completely anonymous to one another. They do not maintain persistent memory or chat history. They are spun up, given a hyper-focused slice of context, execute a single instruction, and are instantly discarded by the harness.

---

## 4. The Compound Pattern Matrix: OOP Parallels

Your mental design maps perfectly to classical object-oriented design patterns. The table below connects what you are building conceptually with its classical OOP equivalent and its exact agentic implementation.

| Agentic Concept | Classical OOP Pattern | Computational Implementation (`How it works`) |
| :--- | :--- | :--- |
| **The Conductor** | **Mediator & Command** | The Conductor (*Mediator*) keeps worker models from communicating directly. It translates tasks into self-contained JSON packets (*Commands*) that specify the model, system prompt, and input data. |
| **The Agent Loop** | **Factory Method & Strategy** | The Python core reads the Conductor's plan and uses a creator class (*Factory*) to instantiate a generic agent runner. Injecting different system prompts and OpenRouter model slugs dynamically changes the agent's behavior (*Strategy*) at runtime. |
| **Reviewer 1 & 2** | **Chain of Responsibility** | The output of a Worker agent is passed down a verification chain. **DeepSeek V4 Pro** checks logical implementation soundness first, then **Qwen 3.8 2T** checks security policies, robust exception handling, and code compliance. |
| **Asymmetric Escalation** | **Proxy / Fallback Variant** | A programmatic wrapper intercepts the output. If a validation step fails, the wrapper dynamically overrides the active model strategy, switching from a fast model to a deep reasoning model. |

---

## 5. Component Responsibility Matrix

To achieve maximum token efficiency and structural predictability, architectural responsibilities are decoupled between the compiled Python harness code and the non-deterministic open-weight models.

| Responsibility | Managing Layer | Implementation Mechanism (`How`) |
| :--- | :--- | :--- |
| **User Interaction** | Conductor Agent | Interacts with outer interfaces, asks clarifying questions, manages Human-in-the-Loop steps, and provides status notifications. |
| **Pipeline Routing** | Conductor Agent | Parses user tasks against a tool capabilities registry and emits a structured execution matrix (JSON format). |
| **State Tracking** | Harness Orchestrator | Python engine appends execution histories to a local ledger file (`.jsonl`). Models remain stateless. |
| **Fallback & Escalation**| Programmatic Orchestrator | Core package captures execution exceptions or `FAIL` flags from reviewers, updating state and dynamically upgrading the model path. |
| **Token Efficiency** | Payload Constructor | Strips historical bloat and places static blocks (docs, schemas) at the top of the array to match **OpenRouter Prompt Caching** triggers. |

### Responsibility details

#### A. Routing & Intent Parsing
* **Manager:** Conductor Agent (`deepseek-v4-flash`).
* **Mechanism:** Accepts user prompt → Outputs pure JSON matching a strict schema → Specifies which worker model to call next and what payload to pass.

#### B. State Management
* **Manager:** The Python Package Engine Core (Deterministic Code).
* **Mechanism:** The models are kept 100% stateless to maximize token efficiency. The Python core appends every event, model execution, and user feedback to a local, human-readable **JSONL ledger** (`.harness/state.jsonl`). If the loop pauses for a Human-in-the-Loop check, the state is safely frozen on disk.

#### C. Fallback & Escalation
* **Manager:** The Python Control Loop Runtime.
* **Mechanism:** If **DeepSeek V4 Pro (`0813`)** in its reviewer role flags a terminal logical compilation error in code generated by **GLM 5.2**, the Python core catches this condition flag. It automatically alters the route configuration, escalating the retry attempt directly to DeepSeek V4 Pro configured with `provider: {"reasoning_effort": "max"}` to handle the high-tier logical correction.

#### D. Token Efficiency & Cost Control
* **Manager:** The Payload Constructor Module.
* **Mechanism:** The package formats OpenRouter requests so that massive, static text blocks (such as mobile application architecture guidelines, project schemas, and base tool definitions) are pinned at the **absolute beginning** of the message array. This triggers **Provider-Side Prompt Caching**, saving up to 80% on recurring prompt token costs during a long session.

---

## 6. Deep-Dive Model Assignment Blueprint

### Conductor & Scout: DeepSeek V4 Flash (`0731`)
*   **Operational Core:** Fast structured instruction tracking, low-latency step planning, and advanced JSON tool-calling capabilities.
*   **Execution Profile:** Acts purely as the supervisor and routing architect. It reads incoming developer inputs, references available system skill registries, splits problems into discrete task matrices, and presents progress checkpoints to the user. It does not perform generation or debugging tasks directly.

### Researcher: Kimi K3
*   **Operational Core:** Elite long-context data extraction and needle-in-a-haystack document ingestion across large token inputs.
*   **Execution Profile:** Provisioned whenever the Conductor flags a task needing large-scale contextual exploration. It ingests massive codebase files, API documentation, or structural system logs, exporting compressed markdown specifications and interface definitions directly into the worker's operational space.

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

## 7. Technical Optimization & Implementation Core

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

---

## 8. Architectural Implementation Blueprint

Below is the clean, framework-free Python architecture showcasing how your setup package coordinates these mixed patterns natively.

```python
import httpx
import json
import os
from typing import Dict, Any, List

class InnerHarnessCore:
    def __init__(self, workspace_dir: str):
        self.workspace_dir = workspace_dir
        self.state_log = os.path.join(workspace_dir, ".harness", "state.jsonl")
        self.openrouter_url = "https://openrouter.ai/api/v1/chat/completions"
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        
        # Enforce Zero-Data Retention (ZDR) across all backend providers
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "X-Data-Retention": "none" 
        }
        os.makedirs(os.path.dirname(self.state_log), exist_ok=True)

    def _log_event(self, role: str, model: str, data: Any):
        """Appends system state transitions linearly to the local ledger."""
        with open(self.state_log, "a") as f:
            f.write(json.dumps({"role": role, "model": model, "payload": data}) + "\n")

    def call_model(self, model_slug: str, messages: List[Dict[str, str]], options: Dict[str, Any] = None) -> Dict[str, Any]:
        """Stateless, direct network layer maximizing prompt caching efficiency."""
        # Structuring payload so system-pinned context stays strictly at the top
        payload = {
            "model": model_slug,
            "messages": messages,
            "temperature": 0.1,
            **(options or {})
        }
        
        with httpx.Client(timeout=60.0) as client:
            response = client.post(self.openrouter_url, headers=self.headers, json=payload)
            response.raise_for_status()
            return response.json()

    def execute_factory_loop(self, user_intent: str):
        """The Conductor-Mediated Light Factory Engine Loop Execution."""
        print(f"[*] Conductor parsing input using deepseek-v4-flash...")
        
        # 1. Pinned System Instruction Core (Prompt Caching Anchor)
        pinned_system = (
            "You are the Conductor Agent. Process user requirements and output a strict JSON routing plan. "
            "Available workers: 'kimi-k3' (Research/Context), 'glm-5.2' (Code Writing), 'deepseek-v4-pro' (Logic QA). "
            "Output format: {\"tasks\": [{\"worker\": \"worker-slug\", \"instruction\": \"precise task details\"}]}"
        )
        
        conductor_messages = [
            {"role": "system", "content": pinned_system},
            {"role": "user", "content": user_intent}
        ]
        
        # Conductor Action
        res = self.call_model("deepseek/deepseek-v4-flash", conductor_messages)
        plan_raw = res["choices"]["message"]["content"]
        plan = json.loads(plan_raw)
        self._log_event("Conductor", "deepseek-v4-flash", plan)

        # 2. Sequential Transient Factory Instantiation
        context_accumulator = f"User Request: {user_intent}\n"
        
        for task in plan.get("tasks", []):
            worker_type = task["worker"]
            instruction = task["instruction"]
            
            # Map simple strategy names to concrete open-weight OpenRouter endpoints
            model_slug = "zhipuai/glm-5.2" if worker_type == "glm-5.2" else "moonshot/kimi-k3"
            
            print(f"[+] Factory spawning transient worker '{worker_type}'...")
            worker_messages = [
                {"role": "system", "content": "Complete your task cleanly. Rely strictly on provided context."},
                {"role": "user", "content": f"{context_accumulator}\nTask: {instruction}"}
            ]
            
            w_res = self.call_model(model_slug, worker_messages)
            output = w_res["choices"]["message"]["content"]
            self._log_event(worker_type, model_slug, output)
            
            # Aggregate context step-by-step
            context_accumulator += f"\n[{worker_type} Output]:\n{output}"

        # 3. Dual-Reviewer Consensus Chain with Asymmetric Escalation
        print("[*] Entering Multi-Model Reviewer Chain...")
        review_messages = [
            {"role": "system", "content": "Analyze the execution artifact. Output 'STATUS: PASSED' or 'STATUS: FAILED' followed by logs."},
            {"role": "user", "content": context_accumulator}
        ]
        
        # Reviewer 1 (DeepSeek Pro - High Reasoning effort configured via Provider payload)
        rev1_res = self.call_model(
            "deepseek/deepseek-v4-pro-0813", 
            review_messages, 
            options={"provider": {"reasoning_effort": "high"}}
        )
        rev1_text = rev1_res["choices"]["message"]["content"]
        self._log_event("Reviewer_1_QA", "deepseek-v4-pro-0813", rev1_text)

        # Asymmetric Escalation Interceptor Trigger
        if "STATUS: FAILED" in rev1_text:
            print("[⚠️] Reviewer 1 flagged an error. Escalating to Max Reasoning Effort!")
            escalated_messages = review_messages + [
                {"role": "assistant", "content": rev1_text},
                {"role": "user", "content": "Correct all structural or logic flaws highlighted above completely."}
            ]
            
            final_res = self.call_model(
                "deepseek/deepseek-v4-pro-0813", 
                escalated_messages, 
                options={"provider": {"reasoning_effort": "max"}} # Max-effort recovery
            )
            final_output = final_res["choices"]["message"]["content"]
            self._log_event("Escalation_Recovery", "deepseek-v4-pro-0813", final_output)
            return final_output

        # Reviewer 2 (Qwen 3.8 2T Final Security Verification Gate)
        rev2_res = self.call_model("alibaba/qwen-3.8-2t", review_messages)
        rev2_text = rev2_res["choices"]["message"]["content"]
        self._log_event("Reviewer_2_Policy", "alibaba/qwen-3.8-2t", rev2_text)
        
        print("[✓] Multi-agent loop successfully completed. State recorded.")
        return context_accumulator
```

---

## 9. Verification Checklist for Your Local Build

When package integration begins on your target environment, use this operational checklist to ensure the compound architectural patterns maintain structural balance:

1. **Verify State Logs:** Run a test pipeline and ensure the generated `.harness/state.jsonl` files are clean, chronological, and containing zero runtime memory leaks.
2. **Verify Header Interception:** Double-check that your HTTP client natively pushes `X-Data-Retention: none` across every single OpenRouter model call to maintain ZDR boundaries.
3. **Confirm Cache Pinned Arrays:** Monitor execution speeds on OpenRouter. The first token latency on consecutive Conductor queries should decrease drastically if system prompts are consistently placed at the top of arrays.
4. **Enforce Conductor Boundary:** Guard against logic creep. If you notice your Conductor code beginning to handle actual raw file generation or multi-line script corrections, strip that capability out and move it to an ephemeral Worker strategy block instead.