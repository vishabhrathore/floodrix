
To audit and validate this system systematically, you should read the documentation in a specific **Tiered Reading Order**. This prevents information overload and aligns what you read with what you see in the code.

Here is the recommended reading roadmap, along with what codebase files to verify alongside them:

---

### 🗺️ Tier 1: The Architectural Foundations (The "Big Picture")

*Read these first to understand how the system manages tasks, threads, and logical databases.*

1. **`docs/redis-workers-context.md`** & **`docs/worker-logic.md`**
   * **What you learn**: How logical Redis databases are partitioned (DB 0 to 3) and how PostgreSQL coordinates atomic operations with BullMQ via the **Transactional Outbox** pattern.
   * **How to Validate against Code**:
     * Open `src/lib/redis.ts` and check the Redis client initializations.
     * Open `src/workers/outboxRelayer.ts` to see the `FOR UPDATE SKIP LOCKED` raw query claiming jobs.

---

### ⚙️ Tier 2: The Engine Specifications (How Calculations Work)

*Read these to understand execution scoping, formula validation, and node execution.*

1. **`docs/workflow-engine-spec.md`** & **`docs/node-execution-and-creation-flow.md`**
   * **What you learn**: How math expressions are validated, variable scope binding contexts (notations mapping to keys), step-by-step executions, and safety step limits.
   * **How to Validate against Code**:
     * Open `src/server/engine/VariableStore.ts` to check scope management.
     * Open `src/server/engine/handlers/FormulaHandler.ts` to see how inline vs. registry formulas are processed.
     * Open `src/server/engine/WorkflowExecutor.ts` to check how forward/backward stepping modifies states.

---

### 🔍 Tier 3: The Runtime Trace (Tracing a Live Request)

*Read this to follow the code execution flow from the UI to the background workers.*

1. **`docs/workflow-execution-trace.md`**
   * **What you learn**: The sequential, function-by-function trace of what triggers when a run begins, how WebSocket events broadcast progress, and where checkpoints are saved.
   * **How to Validate against Code**:
     * Open `src/features/workflow-canvas/server/execution-router.ts` and trace `startRun`.
     * Open `src/server/engine/listeners/RedisPubSubListener.ts` to verify active channel broadcasts.

---

### 🗄️ Tier 4: Database & Schema Design (Relational Mappings)

*Read this to understand where everything is saved.*

1. **[database_mapping_guide.md](file:///home/vishabh/.gemini/antigravity/brain/5515a40e-995a-48ff-a152-ee74fba581ae/database_mapping_guide.md)** & **`docs/ERD.md`**
   * **What you learn**: Which tables are written to when creating a workflow versus when running it.
   * **How to Validate against Code**:
     * Open `prisma/schema.prisma` and compare the fields of `CalcSession`, `CalcNodeExecution`, and `OutboxJob` directly to the guide.

---

### 📜 Tier 5: Historical Context (Archival Blueprints)

*Read these last, keeping in mind that they represent original plans rather than the current system state.*

1. **`docs/proposeProject.md`** & **`docs/async-infrastructure-journey.md`**
   * **What you learn**: How the project folder structures were planned, and the step-by-step implementation milestones.
   * **Warning**: Remember that `proposeProject.md` mentions *Inngest*, which was ultimately replaced by *BullMQ/Piscina*. Treat it as historical reference, not ground truth.

# System Documentation Index

This directory contains all documentation explaining the design, architecture, database structure, and execution mechanisms of the Floodrix system.

## 🛠️ Workflow Engine & Runtime Architecture

* **[workflow-engine-spec.md](file:///home/vishabh/myproject/nodebase/docs/workflow-engine-spec.md)**
  * *Description:* High-level technical specification and developer manual for the Floodrix Workflow Orchestration Engine (configurations, schema structures, formulas, and markdown templating).
* **[workflow-execution-trace.md](file:///home/vishabh/myproject/nodebase/docs/workflow-execution-trace.md)**
  * *Description:* Highly detailed step-by-step code execution trace mapping a workflow execution from UI down to the database and WebSocket broadcasts.
* **[node-execution-and-creation-flow.md](file:///home/vishabh/myproject/nodebase/docs/node-execution-and-creation-flow.md)**
  * *Description:* Explains the lifecycle of nodes (creation, configuration, stepping, caching, and execution isolation).
* **[workflow-engine-architecture-memory.md](file:///home/vishabh/myproject/nodebase/docs/workflow-engine-architecture-memory.md)**
  * *Description:* Single source of truth context for the engine refactoring, implementation decisions, and design choices.
* **[workflow-engine-handoff-memory.md](file:///home/vishabh/myproject/nodebase/docs/workflow-engine-handoff-memory.md)**
  * *Description:* Complete context handoff of refactoring milestones, patterns, and state handling.
* **[workflow-execution-strategy.md](file:///home/vishabh/myproject/nodebase/docs/workflow-execution-strategy.md)**
  * *Description:* Safety boundaries, threading policies, Piscina worker isolation, and engine error recovery strategies.
* **[workflow_performance_optimization_summary.md](file:///home/vishabh/myproject/nodebase/docs/workflow_performance_optimization_summary.md)**
  * *Description:* Performance details for sub-10ms warm execution latency optimization.
* **[server-and-engine-audit.md](file:///home/vishabh/myproject/nodebase/docs/server-and-engine-audit.md)**
  * *Description:* Function-by-function audit status mapping features to correct, warning, and fix statuses.

## ⚡ Background Workers & Infrastructure

* **[async-infrastructure-journey.md](file:///home/vishabh/myproject/nodebase/docs/async-infrastructure-journey.md)**
  * *Description:* End-to-end retrospective implementation audit log of the asynchronous execution platform.
* **[redis-workers-context.md](file:///home/vishabh/myproject/nodebase/docs/redis-workers-context.md)** & **[outbox-bullmq-workers-memory.md](file:///home/vishabh/myproject/nodebase/docs/outbox-bullmq-workers-memory.md)**
  * *Description:* Architectural guide on Redis connection, transactional outbox pattern, BullMQ, and Piscina worker threads.
* **[worker-logic.md](file:///home/vishabh/myproject/nodebase/docs/worker-logic.md)**
  * *Description:* Execution logic details for background transactional outbox recovery.

## 🗄️ Database & Schema

* **[ERD.md](file:///home/vishabh/myproject/nodebase/docs/ERD.md)**
  * *Description:* Database entity-relationship diagram defined as Mermaid syntax.
* **[ERD_CLEAN.md](file:///home/vishabh/myproject/nodebase/docs/ERD_CLEAN.md)**
  * *Description:* Clean/simplified database entity-relationship diagram.

## 📖 Project Level Specs

* **[proposeProject.md](file:///home/vishabh/myproject/nodebase/docs/proposeProject.md)**
  * *Description:* Project Bible mapping the file hierarchy, purpose of each file, and build order.
