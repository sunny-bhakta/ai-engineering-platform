## Master context prompt

---

# 0\. Master Context — Paste This Into Every New Session

Use this at the beginning of **every session**, before the block-specific prompt.

AI Platform — Master Context Prompt

You are working on the same ongoing project across multiple ChatGPT sessions.

## Project

We are building a production-oriented AI Engineering Platform called `ai-engineering-platform`.

The goal is to learn and implement modern AI engineering concepts in one coherent TypeScript monorepo.

The system will eventually support:

- LLM providers
- streaming
- structured outputs
- prompt management
- embeddings
- vector search
- RAG
- advanced RAG
- hybrid search
- reranking
- citations
- tool calling
- LangChain
- LangGraph
- agent workflows
- memory
- human-in-the-loop
- MCP
- multi-agent systems
- GitHub integration
- Slack integration
- Jira integration
- database tools
- web search
- multimodal AI
- GraphRAG
- deep research
- guardrails
- prompt-injection protection
- authentication
- authorization
- multi-tenancy
- evaluation
- observability
- cost tracking
- model routing
- caching
- queues
- workers
- testing
- Docker
- CI/CD
- production deployment

## Architecture principle

Backend first.

The Next.js frontend will be implemented later.

Do NOT redesign the architecture unless there is a strong technical reason.

Keep AI functionality in reusable packages rather than putting all AI logic inside `apps/api`.

## Monorepo

Use:

- pnpm workspaces
- TypeScript
- Node.js
- Vitest
- Docker
- PostgreSQL
- pgvector
- Redis

Expected high-level structure:

apps/\
api/\
worker/\
ingestion/\
web/ # implemented later

packages/\
ai/\
agents/\
rag/\
vector-store/\
tools/\
mcp/\
memory/\
database/\
auth/\
guardrails/\
evaluation/\
observability/\
queue/\
cache/\
storage/\
shared/\
config/

tests/\
e2e/\
integration/\
evaluation/\
fixtures/

infrastructure/\
docker/\
kubernetes/\
terraform/\
monitoring/

docs/

scripts/

## Important architecture rules

1. `apps/api` is the HTTP/application orchestration layer.
2. `packages/ai` owns model/provider abstraction.
3. `packages/rag` owns RAG logic.
4. `packages/vector-store` owns vector database operations.
5. `packages/agents` owns LangGraph workflows.
6. `packages/tools` owns application tools.
7. `packages/mcp` owns MCP integration.
8. `packages/memory` owns AI memory.
9. `packages/database` owns database access.
10. `packages/auth` owns authentication/authorization.
11. `packages/guardrails` owns AI safety checks.
12. `packages/evaluation` owns AI evaluation.
13. `packages/observability` owns tracing, metrics and AI usage.
14. `packages/queue` owns queues.
15. `packages/cache` owns caching.
16. `packages/shared` contains only genuinely shared types/schemas/utilities.

Do not duplicate functionality between packages.

## Dependency principle

Prefer:

apps/api\
↓\
packages/\*\
↓\
infrastructure

Do not make packages depend on `apps/api`.

Avoid circular dependencies.

## Database

Use PostgreSQL.

Use pgvector for embeddings.

Use Redis for caching and background jobs.

## Testing

Use Vitest for unit and integration tests.

Use Playwright later for browser E2E tests.

Every implementation block should include appropriate tests.

## Development

Everything should work locally first.

Use Docker Compose for infrastructure.

Do not introduce Kubernetes/cloud infrastructure unless specifically requested.

## Coding style

Use TypeScript.

Prefer clear production-quality code over clever abstractions.

Use strict TypeScript.

Use schema validation where external/user/LLM data enters the system.

Never trust LLM-generated tool arguments.

## Important instruction

Before changing code:

1. Inspect the existing repository structure.
2. Reuse existing abstractions.
3. Do not recreate files that already exist.
4. Do not silently change architecture.
5. Explain any required architectural change before making it.
6. Keep compatibility with previously implemented blocks.

When providing implementation:

- show the files to create/change
- provide complete code for changed files
- explain important decisions
- include tests
- include commands to run
- mention environment variables
- mention Docker dependencies
- mention how to verify the feature

Do not implement future blocks prematurely.

We are implementing the project incrementally.

---

# 1\. Block 1 — Monorepo Foundation

**Topic:** Workspace, TypeScript, linting, formatting, Vitest, Docker.

Block 1 — Monorepo Foundation Prompt

Using the master project context above, implement BLOCK 1 only: the monorepo foundation.

Create a production-quality pnpm TypeScript monorepo.

Requirements:

- pnpm workspace
- root package.json
- pnpm-workspace.yaml
- tsconfig.base.json
- root Vitest configuration
- ESLint
- Prettier
- .gitignore
- .env.example
- Docker Compose foundation
- apps/api
- apps/worker
- apps/ingestion
- packages/shared
- packages/config

Do NOT implement LLM, RAG, agents, MCP or frontend yet.

The API should have a basic health endpoint.

The worker should start successfully.

The ingestion app should have a basic entry point.

Create appropriate package.json files and workspace dependencies.

Add a simple Vitest test.

At the end provide:

1.Complete file tree. 2. Every file that was created/changed. 3. Complete code. 4. Installation commands. 5. Test commands. 6. Build commands. 7. Explanation of workspace dependency relationships.

Everything must run locally.

---

# 2\. Block 2 — Database

**Topic:** PostgreSQL, migrations, repositories, schema.

Block 2 — Database Foundation Prompt

Using the master project context and the existing repository, implement BLOCK 2 only: the database layer.

Create/extend:

packages/database

Use PostgreSQL.

Requirements:

- database connection
- configuration
- migrations
- schema
- repository pattern where appropriate
- local Docker PostgreSQL
- health check
- transaction support

Create initial entities:

- users
- organizations
- memberships
- projects
- conversations
- messages
- documents
- document\_chunks

Keep the schema extensible for future:

- embeddings
- agents
- agent\_runs
- tool\_calls
- approvals
- memories
- evaluations
- usage
- audit\_logs

Do not implement RAG yet.

Do not implement authentication yet.

Include:

- migration strategy
- seed strategy
- tests
- Docker instructions
- environment variables
- commands to migrate/reset/test

Maintain the existing architecture.

---

# 3\. Block 3 — AI Model Layer

**Topic:** OpenAI/Anthropic/Gemini abstraction.

Block 3 — AI Model Abstraction Prompt

Implement BLOCK 3 only: the AI model abstraction.

Create:

packages/ai

Requirements:

- provider abstraction
- OpenAI provider
- Anthropic provider
- Gemini provider
- chat completion abstraction
- streaming
- structured output
- token usage
- model configuration
- timeout handling
- retry handling
- normalized errors

The rest of the application must depend on the internal AI abstraction instead of directly importing provider SDKs.

Design a clean interface such as:

AI model\
Chat model\
Embedding model

Do not implement RAG yet.

Do not implement agents yet.

Do not implement frontend.

Add unit tests with mocked providers.

Include example API usage from apps/api.

Include environment variables.

Make sure secrets never appear in source code.

---

# 4\. Block 4 — Basic Chat API

**Topic:** LLM chat \+ streaming.

Block 4 — Basic Chat API Prompt

Implement BLOCK 4 only: basic AI chat through the API.

Build:

POST /chat\
POST /chat/stream

Requirements:

- request validation
- conversation persistence
- message persistence
- AI package integration
- streaming response
- token usage tracking
- error handling
- request ID
- logging

The API must use packages/ai.

Do not implement RAG.

Do not implement tools.

Do not implement LangGraph.

Add unit and integration tests.

Show curl examples for testing the API.

Keep the implementation backend-only.

---

# 5\. Block 5 — Document Upload

**Topic:** Storage + document management.

Block 5 — Document Management Prompt

Implement BLOCK 5 only: document upload and storage.

Create/extend:

packages/storage\
apps/api\
packages/database

Support:

- local file storage initially
- document metadata
- upload API
- download API
- delete API
- document status

Document states:

UPLOADED\
PROCESSING\
READY\
FAILED

Do not implement embeddings yet.

Do not implement vector search yet.

Design the document model so that future ingestion can process the document asynchronously.

Add validation for:

- file size
- MIME type
- filename
- organization/project ownership

Add tests.

---

# 6\. Block 6 — Queue + Worker

**Topic:** Redis/BullMQ/background processing.

Block 6 — Queue and Worker Prompt

Implement BLOCK 6 only: background job infrastructure.

Create:

packages/queue

Use Redis and a suitable Node.js queue library.

Requirements:

- queue abstraction
- job producers
- workers
- retries
- exponential backoff
- job status
- failure handling
- graceful shutdown

Create a document-processing queue.

Flow:

API\
→ Queue\
→ Worker\
→ Document processor

Do not implement embeddings yet.

Add local Docker Redis.

Add tests for queue behavior where practical.

Explain how to run API, Redis and worker locally.

---

# 7\. Block 7 — Document Ingestion

**Topic:** loaders, parsing, chunking.

Block 7 — Document Ingestion Prompt

Implement BLOCK 7 only: document ingestion.

Use:

apps/ingestion\
packages/rag

Support initially:

- Markdown
- TXT
- HTML
- PDF

Build:

loader\
→ parser\
→ cleaner\
→ chunker\
→ metadata extraction

Store document chunks in PostgreSQL.

Each chunk should have metadata such as:

- document ID
- project ID
- organization ID
- source path
- page number where applicable
- chunk index
- content
- metadata

Do not implement vector search yet.

Do not implement agents.

Include unit tests for chunking and parsing.

---

# 8\. Block 8 — Embeddings + pgvector

**Topic:** embeddings/vector DB.

Block 8 — Embeddings and Vector Store Prompt

Implement BLOCK 8 only: embeddings and vector storage.

Create:

packages/vector-store

Extend:

packages/ai\
packages/rag\
packages/database

Use PostgreSQL + pgvector locally.

Implement:

- embedding generation
- vector storage
- similarity search
- metadata filtering
- tenant/project isolation
- delete/update vectors

Create appropriate indexes.

Build:

document chunk\
→ embedding\
→ pgvector

Add tests.

Explain vector dimensions and how the selected embedding model relates to the database schema.

Do not implement advanced RAG yet.

---

# 9\. Block 9 — Basic RAG

**Topic:** retrieval-augmented generation.

Block 9 — Basic RAG Prompt

Implement BLOCK 9 only: basic RAG.

Build:

user query\
→ embedding\
→ vector search\
→ relevant chunks\
→ prompt\
→ LLM\
→ answer

Create a reusable RAG service in packages/rag.

Add:

- top-k retrieval
- similarity threshold
- metadata filtering
- context construction
- source metadata
- citations

Extend POST /chat so it can optionally use RAG.

Do not implement agents yet.

Add retrieval tests and integration tests.

Show an example query using curl.

---

# 10\. Block 10 — Advanced RAG

**Topic:** hybrid retrieval, reranking, query rewriting.

Block 10 — Advanced RAG Prompt

Implement BLOCK 10 only: advanced RAG.

Extend packages/rag with:

- query rewriting
- multi-query retrieval
- keyword search
- vector search
- hybrid search
- reranking
- context compression
- metadata filtering
- citation generation

Architecture:

Query\
→ rewrite\
→ vector + keyword retrieval\
→ merge\
→ rerank\
→ context compression\
→ LLM\
→ citations

Keep each retrieval strategy independently testable.

Do not implement agents yet.

Include tests comparing basic and advanced retrieval.

---

# 11\. Block 11 — Code RAG

**Topic:** GitHub/codebase understanding.

Block 11 — Code Repository RAG Prompt

Implement BLOCK 11 only: codebase-aware RAG.

Create code-specific ingestion functionality.

Support:

- TypeScript
- JavaScript
- JSON
- YAML
- Markdown

Implement:

- language detection
- source-file filtering
- code-aware chunking
- symbol metadata
- file path metadata
- line numbers
- repository metadata

Never index:

- node\_modules
- .git
- dist
- build
- coverage
- .env
- secrets

Store metadata such as:

repository\
branch\
commit\
path\
language\
symbol\
startLine\
endLine

Do not implement GitHub OAuth yet.

Local Git repositories can be used as input.

Add tests.

---

# 12\. Block 12 — Tool System

**Topic:** function/tool calling.

Block 12 — Tool Calling Framework Prompt

Implement BLOCK 12 only: a reusable tool framework.

Create:

packages/tools

Implement:

- tool interface
- tool registry
- Zod input schemas
- tool execution
- tool errors
- timeout
- retry
- permissions metadata
- audit metadata

Build initial tools:

- calculator
- document search
- project search
- database read tool

The LLM must be able to request a tool.

Never execute arbitrary LLM-generated code.

Validate all tool arguments.

Add tests for:

- registration
- schema validation
- execution
- errors
- permissions

---

# 13\. Block 13 — LangChain

**Topic:** LangChain integration.

Block 13 — LangChain Prompt

Implement BLOCK 13 only: integrate LangChain where useful.

Use LangChain for appropriate abstractions such as:

- models
- prompts
- retrievers
- tools
- document abstractions

Do not allow LangChain-specific implementation details to leak unnecessarily through the entire application.

Keep our own domain interfaces around AI/RAG/tools.

Demonstrate:

- LangChain model
- LangChain retriever
- LangChain tool

Add tests.

Explain which responsibilities belong to LangChain versus our own packages.

Do not implement LangGraph yet.

---

# 14\. Block 14 — LangGraph

**Topic:** agent workflow engine.

Block 14 — LangGraph Prompt

Implement BLOCK 14 only: LangGraph.

Create:

packages/agents

Implement a basic agent graph:

START\
→ analyze\
→ decide whether retrieval is required\
→ retrieve\
→ decide whether a tool is required\
→ execute tool\
→ generate answer\
→ END

Implement:

- graph state
- nodes
- edges
- conditional routing
- tool execution
- errors
- checkpoints where appropriate

Keep agent logic inside packages/agents.

Add tests for graph transitions.

Do not implement multi-agent yet.

---

# 15\. Block 15 — Agent Memory

**Topic:** short-term + long-term memory.

Block 15 — Agent Memory Prompt

Implement BLOCK 15 only: AI memory.

Create:

packages/memory

Implement:

1. short-term conversation memory
2. long-term memory
3. semantic memory
4. episodic memory
5. memory retrieval
6. memory summarization

Use PostgreSQL initially.

Integrate memory into LangGraph state.

Ensure memory is isolated by organization/user/project.

Add tests.

Do not implement multi-agent yet.

---

# 16\. Block 16 — GitHub Integration

**Topic:** real repository connection.

Block 16 — GitHub Integration Prompt

Implement BLOCK 16 only: GitHub repository integration.

Users should be able to connect GitHub and select a repository.

Implement the backend architecture for:

GitHub connection\
→ repository selection\
→ branch selection\
→ indexing job\
→ worker\
→ repository ingestion\
→ code chunks\
→ embeddings\
→ pgvector

Use GitHub APIs appropriately.

Do not put GitHub credentials into the database insecurely.

Design the system so repositories can be re-indexed incrementally.

Track:

- repository
- branch
- commit
- indexed files
- indexing status
- last indexed timestamp

Add tests using mocks.

Do not build the Next.js UI yet.

---

# 17\. Block 17 — GitHub Incremental Indexing

**Topic:** webhook \+ changed files.

Block 17 — Incremental GitHub Indexing Prompt

Implement BLOCK 17 only: incremental repository indexing.

Build:

GitHub push event\
→ webhook\
→ verify webhook\
→ identify changed files\
→ queue indexing job\
→ reprocess changed files\
→ remove deleted files/chunks\
→ update vectors

Avoid re-indexing the entire repository unnecessarily.

Track commit SHA.

Implement idempotency.

Add tests for:

- added file
- modified file
- deleted file
- duplicate webhook
- invalid webhook

---

# 18\. Block 18 — MCP

**Topic:** Model Context Protocol.

Block 18 — MCP Prompt

Implement BLOCK 18 only: MCP.

Create:

packages/mcp

Implement:

- MCP client abstraction
- MCP server abstraction
- tool discovery
- resource discovery
- MCP tool invocation

Create one small local custom MCP server for this project.

Demonstrate the difference between:

normal internal tools

and

MCP tools.

Keep MCP optional so existing tools continue working.

Add tests and local development instructions.

---

# 19\. Block 19 — Human-in-the-Loop

**Topic:** approvals.

Block 19 — Human Approval Prompt

Implement BLOCK 19 only: human-in-the-loop approvals.

Implement approval workflow:

Agent\
→ sensitive action\
→ approval request\
→ WAIT\
→ human approve/reject\
→ resume graph

Create approval persistence.

Support:

- pending
- approved
- rejected
- expired

Sensitive actions should require approval.

Examples:

- create Jira ticket
- modify GitHub
- deploy
- send Slack message
- write database

Integrate with LangGraph interrupts/checkpoints.

Add tests.

---

# 20\. Block 20 — Multi-Agent

**Topic:** supervisor + specialist agents.

Block 20 — Multi-Agent Prompt

Implement BLOCK 20 only: multi-agent architecture.

Create:

Supervisor Agent\
Research Agent\
Coding Agent\
Operations Agent

Architecture:

Supervisor\
├── Research Agent\
├── Coding Agent\
└── Operations Agent

Use LangGraph.

Implement shared state carefully.

The supervisor should delegate rather than duplicate specialist functionality.

Add tests for routing/delegation.

Do not build unnecessary autonomous behavior.

Keep agents deterministic where possible.

---

# 21\. Block 21 — Multimodal

**Topic:** images/PDF/vision.

Block 21 — Multimodal AI Prompt

Implement BLOCK 21 only: multimodal AI.

Support:

- image input
- screenshots
- architecture diagrams
- PDF visual content

Integrate vision-capable models through packages/ai.

Extend RAG to support multimodal document metadata.

Example capability:

User uploads architecture diagram and asks:

"Explain this architecture and identify dependencies."

Add tests using mocked model responses.

Keep the implementation provider-independent.

---

# 22\. Block 22 — Web Research

**Topic:** web search + source verification.

Block 22 — Web Research Agent Prompt

Implement BLOCK 22 only: web research.

Create:

web search tool\
page retrieval\
content extraction\
source metadata\
citation generation

Build a controlled research workflow.

Architecture:

Question\
→ Search\
→ Retrieve pages\
→ Extract content\
→ Analyze\
→ Cross-check\
→ Answer with citations

Implement source URLs, titles and timestamps.

Protect the agent against web-based prompt injection.

Add tests using mocked search results.

---

# 23\. Block 23 — GraphRAG

**Topic:** knowledge graph.

Block 23 — GraphRAG Prompt

Implement BLOCK 23 only: GraphRAG.

Create a knowledge graph representation for entities and relationships.

Example:

PaymentService\
→ depends\_on → AuthService

PaymentService\
→ uses → PostgreSQL

Implement:

- entity extraction
- relationship extraction
- graph storage
- graph traversal
- graph retrieval
- GraphRAG context generation

Integrate with existing RAG without replacing normal vector RAG.

Explain when graph retrieval should be used instead of vector retrieval.

Add tests.

---

# 24\. Block 24 — Deep Research

**Topic:** advanced research agent.

Block 24 — Deep Research Prompt

Implement BLOCK 24 only: deep research workflow.

Use LangGraph.

Workflow:

Question\
→ Planning\
→ Search\
→ Read\
→ Extract\
→ Evaluate evidence\
→ Search again if needed\
→ Synthesize\
→ Cite sources\
→ Final report

Implement bounded loops.

Prevent infinite agent execution.

Track:

- sources
- searches
- tool calls
- reasoning state
- execution time
- token usage

Add configurable limits:

- max searches
- max steps
- max tokens
- max execution time

Add tests.

---

# 25\. Block 25 — Authentication

**Topic:** user identity.

Block 25 — Authentication Prompt

Implement BLOCK 25 only: authentication.

Create:

packages/auth

Implement a production-appropriate authentication architecture.

Support:

- registration/login or external identity provider abstraction
- sessions/tokens
- password/security handling where applicable
- current-user resolution
- API authentication middleware

Do not implement authorization yet beyond basic authenticated-user checks.

Ensure secrets are configurable through environment variables.

Add tests.

---

# 26\. Block 26 — Authorization + Multi-Tenancy

**Topic:** RBAC, organizations, project isolation.

Block 26 — Authorization and Multi-Tenancy Prompt

Implement BLOCK 26 only.

Implement:

- organizations
- memberships
- roles
- permissions
- project-level access
- resource ownership
- tenant isolation

Example roles:

Viewer\
Developer\
Manager\
Admin

Every database query involving tenant data must enforce appropriate organization/project boundaries.

Tool execution must also check authorization.

Add security tests specifically for cross-tenant access.

---

# 27\. Block 27 — Guardrails

**Topic:** AI security.

Block 27 — AI Guardrails Prompt

Implement BLOCK 27 only: AI guardrails.

Create:

packages/guardrails

Implement:

- input validation
- output validation
- prompt injection detection
- indirect prompt injection defenses
- sensitive information detection
- tool safety checks
- maximum execution limits
- content validation

Important:

Never treat LLM output as trusted.

Tool arguments must be schema validated and authorization checked before execution.

Add security tests.

Do not claim guardrails can perfectly detect prompt injection; use layered defenses.

---

# 28\. Block 28 — Evaluation

**Topic:** AI evaluation framework.

Block 28 — AI Evaluation Prompt

Implement BLOCK 28 only: AI evaluation.

Create:

packages/evaluation

Implement datasets and evaluators for:

RAG\
Agents\
Tools\
Citations

Measure:

- retrieval relevance
- answer relevance
- faithfulness
- citation correctness
- tool selection
- tool argument correctness
- task completion

Create a regression evaluation suite.

Allow evaluations to run from the command line.

Add JSON-based evaluation datasets.

Do not make evaluation logic part of production request handling.

---

# 29\. Block 29 — Observability

**Topic:** tracing, metrics, logs.

Block 29 — AI Observability Prompt

Implement BLOCK 29 only: observability.

Create:

packages/observability

Track:

- request ID
- traces
- spans
- model calls
- token usage
- latency
- retrieval
- tool calls
- agent transitions
- errors
- cost

Use OpenTelemetry-compatible architecture.

Every AI request should be traceable from:

API\
→ Agent\
→ RAG\
→ Tool\
→ Model\
→ Response

Do not log secrets or sensitive user data unnecessarily.

Add tests.

---

# 30\. Block 30 — Cost \+ Model Routing

**Topic:** model selection and optimization.

Block 30 — Model Routing and Cost Prompt

Implement BLOCK 30 only.

Implement:

- model routing
- cost tracking
- token budgets
- fallback models
- provider fallback
- configurable model selection

Example:

Simple classification\
→ cheaper model

Complex reasoning\
→ stronger model

Vision\
→ vision model

Embedding\
→ embedding model

Keep routing policy configurable.

Do not hard-code provider-specific business logic throughout the application.

Add tests.

---

# 31. Block 31 — Caching

**Topic:** Redis, response cache, semantic cache.

Block 31 — AI Caching Prompt

Implement BLOCK 31 only.

Create:

packages/cache

Implement:

- Redis cache
- exact response cache
- embedding cache
- retrieval cache
- configurable semantic cache abstraction

Cache keys must respect:

- organization
- project
- user
- model
- prompt/version where relevant

Never allow cached data to cross tenants.

Add cache invalidation strategy.

Add tests.

---

# 32\. Block 32 — Reliability

**Topic:** production failure handling.

Block 32 — AI Reliability Prompt

Implement BLOCK 32 only.

Add reliability mechanisms:

- timeouts
- retries
- exponential backoff
- circuit breaker where appropriate
- provider fallback
- graceful degradation
- idempotency
- worker retries
- dead-letter handling
- graceful shutdown

Apply appropriate policies to:

LLM\
RAG\
tools\
external APIs\
queues

Do not blindly retry non-idempotent operations.

Add failure tests.

---

# 33\. Block 33 — API Completion

**Topic:** finalize backend API.

Block 33 — Backend API Completion Prompt

Now consolidate the backend without redesigning it.

Review all existing backend functionality and expose clean APIs for:

Authentication\
Organizations\
Projects\
Chat\
Streaming\
Documents\
Search\
RAG\
Repositories\
Agents\
Tools\
Approvals\
Memory\
Evaluations\
Usage\
Observability

Requirements:

- consistent API response format
- validation
- authentication
- authorization
- pagination
- error handling
- request IDs
- OpenAPI documentation where appropriate

Do not build the frontend yet.

First identify inconsistencies or duplicated logic and fix them without changing the overall architecture.

---

# 34\. Block 34 — Backend Testing

**Topic:** complete backend test suite.

Block 34 — Backend Testing Prompt

Review the complete backend and implement the missing test coverage.

Use Vitest.

Create tests for:

- packages
- API
- database
- RAG
- vector search
- tools
- agents
- memory
- MCP
- guardrails
- authorization
- queues
- evaluation
- observability

Add integration tests using local Docker services.

Add security tests for tenant isolation and unauthorized tool execution.

Add deterministic mocks for external AI APIs.

Provide one root command that runs all backend tests.

---

# 35\. Block 35 — Next.js Frontend Foundation

**Topic:** frontend starts only now.

Block 35 — Next.js Frontend Prompt

Implement BLOCK 35 only: Next.js frontend foundation.

Create:

apps/web

Use:

- Next.js
- React
- TypeScript
- Tailwind

Create application layout and navigation.

Pages:

Dashboard\
Chat\
Documents\
Repositories\
Agents\
Approvals\
Evaluations\
Observability\
Settings

Do not implement detailed functionality yet.

Create a clean frontend architecture that consumes the existing API.

Do not move backend business logic into Next.js.

---

# 36\. Block 36 — Chat UI

**Topic:** streaming AI chat.

Block 36 — Chat UI Prompt

Implement BLOCK 36 only.

Build the Chat interface.

Support:

- conversation list
- message history
- streaming responses
- loading state
- errors
- retry
- citations
- tool execution indicators
- agent status

Connect to the existing API.

Do not duplicate AI/RAG logic in the frontend.

The backend remains the source of truth.

---

# 37\. Block 37 — Knowledge Base UI

**Topic:** documents + RAG.

Block 37 — Knowledge Base UI Prompt

Implement BLOCK 37 only.

Build UI for:

- document upload
- document list
- processing status
- document deletion
- search
- citations
- ingestion errors

Show:

UPLOADED\
PROCESSING\
READY\
FAILED

Connect to existing APIs.

Do not implement ingestion logic in the frontend.

---

# 38\. Block 38 — GitHub UI

**Topic:** repository connection.

Block 38 — GitHub UI Prompt

Implement BLOCK 38 only.

Create repository management UI.

Flow:

Connect GitHub\
→ Select organization\
→ Select repository\
→ Select branch\
→ Index repository\
→ Show progress\
→ Show indexed status

Display:

- repository
- branch
- commit
- file count
- chunk count
- indexing status
- last indexed time

Use existing backend APIs.

---

# 39\. Block 39 — Agent UI

**Topic:** agents and workflows.

Block 39 — Agent UI Prompt

Implement BLOCK 39 only.

Create UI for:

- available agents
- agent execution
- execution status
- tool calls
- graph/workflow status
- agent output
- errors
- execution history

Agents should be invoked through the existing API.

Do not implement agent logic in Next.js.

---

# 40\. Block 40 — Human Approval UI

**Topic:** approval interface.

Block 40 — Human Approval UI Prompt

Implement BLOCK 40 only.

Create an approval center.

Display:

- pending approvals
- action
- agent
- requested tool
- arguments
- reason
- risk information
- created time

Actions:

Approve\
Reject

After approval/rejection, update the UI and show workflow status.

Use existing backend approval APIs.

---

# 41\. Block 41 — Evaluation Dashboard

**Topic:** AI quality.

Block 41 — Evaluation Dashboard Prompt

Implement BLOCK 41 only.

Create evaluation dashboard showing:

- evaluation datasets
- evaluation runs
- pass/fail
- retrieval metrics
- answer quality
- citation quality
- tool accuracy
- task completion
- regression results

Connect to packages/evaluation through API endpoints.

Do not run evaluation logic directly inside the browser.

---

# 42\. Block 42 — Observability Dashboard

**Topic:** AI operations.

Block 42 — Observability Dashboard Prompt

Implement BLOCK 42 only.

Create dashboard for:

- requests
- agent runs
- model calls
- tokens
- cost
- latency
- errors
- retrieval
- tools
- traces

Allow selecting an individual AI execution and viewing:

API\
→ Agent\
→ RAG\
→ Tools\
→ Models\
→ Final response

Use existing observability APIs.

---

# 43\. Block 43 — E2E Testing

**Topic:** Playwright.

Block 43 — E2E Testing Prompt

Implement BLOCK 43 only.

Add Playwright E2E tests.

Test critical flows:

1. Login
2. Create project
3. Upload document
4. Wait for ingestion
5. Ask RAG question
6. Receive cited answer
7. Connect repository
8. Start indexing
9. Run agent
10. Trigger approval
11. Approve tool execution
12. View execution history

Use test fixtures and deterministic mocks where external services would make tests unreliable.

---

# 44\. Block 44 — Docker Local Environment

**Topic:** complete local development.

Block 44 — Local Docker Environment Prompt

Finalize local development infrastructure.

Docker Compose should provide:

PostgreSQL\
pgvector\
Redis\
MinIO\
optional observability services

Document:

- startup
- shutdown
- migrations
- seeding
- reset
- logs
- troubleshooting

Ensure the complete backend can run locally with minimal manual setup.

Create a developer README.

---

# 45\. Block 45 — CI/CD

**Topic:** GitHub Actions.

Block 45 — CI/CD Prompt

Implement CI/CD.

Pipeline:

Pull Request\
→ install\
→ lint\
→ typecheck\
→ unit tests\
→ integration tests\
→ build\
→ security checks\
→ AI evaluation

Create GitHub Actions workflows.

Do not deploy to production yet.

Use caching appropriately.

Ensure secrets are handled through GitHub Actions secrets.

---

# 46\. Block 46 — Production Readiness Review

This is the final session.

Block 46 — Production Architecture Review Prompt

Perform a complete architecture review of the existing AI Engineering Platform.

Do NOT rewrite the project blindly.

Review:

- monorepo architecture
- package boundaries
- dependency graph
- API
- database
- RAG
- vector search
- agents
- LangGraph
- tools
- MCP
- memory
- GitHub
- multimodal
- GraphRAG
- deep research
- authentication
- authorization
- multi-tenancy
- guardrails
- evaluation
- observability
- caching
- queues
- workers
- testing
- frontend
- Docker
- CI/CD

Identify:

1. architectural problems
2. duplicated functionality
3. circular dependencies
4. security problems
5. data isolation problems
6. missing tests
7. reliability problems
8. scalability problems
9. missing AI evaluation
10. missing observability

For every issue:

- explain why it matters
- identify the affected files/packages
- propose the smallest appropriate fix

Do not introduce unnecessary technologies.

Preserve the existing architecture where it is sound.

At the end provide a final architecture diagram and a production-readiness checklist.

---

# Recommended session sequence

Use them in this order:

```
01  Monorepo Foundation
02  Database
03  AI Model Layer
04  Basic Chat API
05  Document Upload
06  Queue + Worker
07  Document Ingestion
08  Embeddings + pgvector
09  Basic RAG
10  Advanced RAG
11  Code RAG
12  Tool System
13  LangChain
14  LangGraph
15  Memory
16  GitHub
17  Incremental GitHub Indexing
18  MCP
19  Human-in-the-loop
20  Multi-Agent
21  Multimodal
22  Web Research
23  GraphRAG
24  Deep Research
25  Authentication
26  Authorization + Multi-tenancy
27  Guardrails
28  Evaluation
29  Observability
30  Model Routing + Cost
31  Caching
32  Reliability
33  Backend API Completion
34  Backend Testing
35  Next.js Foundation
36  Chat UI
37  Knowledge Base UI
38  GitHub UI
39  Agent UI
40  Approval UI
41  Evaluation UI
42  Observability UI
43  E2E
44  Docker/local environment
45  CI/CD
46  Production review
```

## One important rule for using these prompts

At the start of every new ChatGPT session, paste:

```
MASTER CONTEXT
+
BLOCK N PROMPT
```

Then tell it:

> **"First inspect the existing repository and continue from the current implementation. Do not recreate the project from scratch."**

That is particularly important from Block 10 onward. Each new session should **read the actual files in your repository and adapt to what is already there**, rather than trusting the previous conversation's description.

Also, I would **not ask each session to generate the entire project again**. Ask it to implement only that block, run/describe tests, and preserve everything already working. This will keep the codebase much more consistent across dozens of sessions.

Yes. Your list is strong on **application + AI engineering**, but it is missing a proper **Infrastructure & Operations track**.

I would add these blocks **after CI/CD and before the final production review**.

## Infrastructure & Operations blocks

### Block 47 — Infrastructure Architecture

Cover:

- AWS/GCP/Azure architecture
- VPC/networking
- public/private subnets
- load balancer
- DNS
- TLS
- secrets
- IAM
- PostgreSQL
- Redis
- object storage
- queues
- workers
- container registry
- compute

The goal is to map your local architecture to production infrastructure without changing the application architecture.

---

### Block 48 — Production Docker

Cover:

- multi-stage Dockerfiles
- minimal images
- non-root containers
- health checks
- graceful shutdown
- environment configuration
- image tagging
- vulnerability scanning
- container resource limits

You should have separate images for:

```
api
worker
ingestion
web
```

---

### Block 49 — Kubernetes

This is where Kubernetes becomes useful.

Cover:

```
Deployment
Service
Ingress
ConfigMap
Secret
HPA
Job
CronJob
PVC
Namespace
RBAC
```

Architecture:

```
                    Load Balancer
                         │
                       Ingress
                    ┌────┴────┐
                    │         │
                  Web        API
                              │
              ┌───────────────┼───────────────┐
              │               │               │
            Worker        Ingestion         Agents
              │               │
              └───────┬───────┘
                      │
                PostgreSQL
                Redis
                Object Storage
```

---

### Block 50 — Terraform / Infrastructure as Code

Create:

```
infrastructure/
└── terraform/
    ├── modules/
    │   ├── network/
    │   ├── database/
    │   ├── redis/
    │   ├── storage/
    │   ├── kubernetes/
    │   └── monitoring/
    │
    └── environments/
        ├── dev/
        ├── staging/
        └── production/
```

Learn:

- Terraform state
- modules
- variables
- outputs
- remote state
- environment separation
- IAM
- networking

---

### Block 51 — Secrets & Configuration

This deserves its own block.

Cover:

```
Local
  ↓
.env

CI
  ↓
CI secrets

Production
  ↓
Cloud Secret Manager / Vault
```

Manage:

- database credentials
- API keys
- GitHub credentials
- OAuth secrets
- encryption keys
- JWT/session secrets

Also cover **secret rotation** and preventing secrets from appearing in logs.

---

### Block 52 — Monitoring

Go beyond application logging.

Monitor:

```
Infrastructure
├── CPU
├── Memory
├── Disk
├── Network
└── Container health

Application
├── Requests
├── Errors
├── Latency
└── Throughput

AI
├── Tokens
├── Cost
├── Model latency
├── RAG latency
├── Tool calls
└── Agent failures
```

A useful architecture is:

```
Application
    │
    ▼
OpenTelemetry
    │
    ├── Metrics
    ├── Logs
    └── Traces
           │
           ▼
      Observability
       Platform
```

---

### Block 53 — Alerting

Monitoring tells you **what is happening**.

Alerting tells you **when you need to act**.

Examples:

```
API error rate > threshold
Database CPU high
Redis unavailable
Queue backlog increasing
Worker failures increasing
LLM provider errors increasing
AI cost unexpectedly increasing
Agent execution timeout increasing
Disk nearly full
Certificate approaching expiration
```

Build alert policies and escalation rules.

---

### Block 54 — Logging

Implement centralized structured logging.

Example:

```
{
  "timestamp": "...",
  "level": "error",
  "service": "worker",
  "environment": "production",
  "requestId": "...",
  "jobId": "...",
  "organizationId": "...",
  "error": "..."
}
```

Important:

**Never log:**

- API keys
- passwords
- OAuth tokens
- secrets
- unnecessary personal data
- raw sensitive prompts/responses

---

### Block 55 — Distributed Tracing

This is particularly valuable for your AI platform.

You want to see:

```
HTTP Request
     │
     ▼
Agent Run
     │
     ├── LLM Call
     │
     ├── RAG
     │    ├── Embedding
     │    ├── Vector Search
     │    └── Reranker
     │
     ├── Tool Call
     │
     └── LLM Call
```

Then investigate:

> Why did this request take 12 seconds?

and see exactly where the time went.

---

### Block 56 — Queue Operations

Your system will eventually have lots of asynchronous work:

```
GitHub indexing
Document ingestion
Embeddings
Deep research
Agent jobs
Evaluation
Emails
Webhooks
```

So cover:

- queue depth
- retries
- dead-letter queues
- stuck jobs
- worker scaling
- job idempotency
- priority queues
- scheduled jobs
- graceful worker shutdown

---

### Block 57 — Database Operations

Cover:

- PostgreSQL backups
- point-in-time recovery
- migrations
- connection pooling
- indexes
- query performance
- pgvector indexes
- replication
- database monitoring
- restore testing

Most importantly:

> **A backup that has never been restored is not a verified backup strategy.**

Include restore drills.

---

### Block 58 — Disaster Recovery

Design:

```
Primary
   │
   ├── Database backup
   ├── Object storage backup
   └── Configuration backup

        ↓

Recovery Environment
```

Define:

- RPO
- RTO
- backup frequency
- retention
- restore procedure
- regional failure strategy
- database recovery
- queue recovery

---

### Block 59 — Security Operations

Cover:

- IAM
- least privilege
- network policies
- container security
- dependency scanning
- image scanning
- SAST
- DAST
- secret scanning
- audit logs
- vulnerability management
- security incident response

For your AI system, also include:

```
Prompt Injection
Tool Abuse
Data Exfiltration
Cross-Tenant Access
Malicious Documents
Malicious GitHub Repositories
MCP Tool Abuse
```

---

### Block 60 — Cost Operations / FinOps

This is especially important for an AI application.

Track:

```
Infrastructure cost
+
Database cost
+
Redis cost
+
Storage cost
+
Network cost
+
LLM cost
+
Embedding cost
```

Then calculate:

```
cost / request
cost / conversation
cost / agent run
cost / organization
cost / document
cost / million tokens
```

You can then build budgets and alerts.

---

### Block 61 — Scaling

Learn how each component scales independently:

```
                 Load
                  │
                  ▼
             API replicas
             /     |     \
            /      |      \
        Worker  Worker  Worker
           │
        Queue
           │
     ┌─────┴─────┐
     ▼           ▼
 PostgreSQL    Redis
```

Cover:

- horizontal scaling
- autoscaling
- worker autoscaling
- queue-based scaling
- database bottlenecks
- connection pooling
- rate limiting
- backpressure

---

### Block 62 — Production Deployment

Finally create:

```
Development
     ↓
CI
     ↓
Build
     ↓
Security Scan
     ↓
Staging
     ↓
Integration Tests
     ↓
AI Evaluation
     ↓
Approval
     ↓
Production
```

Include:

- blue/green or rolling deployment
- migrations
- health checks
- readiness checks
- rollback
- feature flags
- canary releases

---

### Block 63 — SRE / Incident Management

This is the piece many AI projects skip.

Learn:

- SLIs
- SLOs
- SLAs
- error budgets
- incident severity
- incident response
- runbooks
- postmortems
- on-call
- escalation

Example:

```
SLO

99.9% successful API requests
< 2s p95 API latency
< 1% failed background jobs
```

Then create runbooks:

```
RUNBOOK: Redis Down

1. Confirm outage
2. Check health
3. Check connections
4. Restart/failover
5. Check queue recovery
6. Verify workers
7. Verify API
8. Record incident
```

---

# Updated overall roadmap

Your complete learning project now becomes:

```
FOUNDATION
01  Monorepo
02  Database
03  AI Model Layer

APPLICATION AI
04  Chat
05  Documents
06  Queue
07  Ingestion
08  Embeddings
09  RAG
10  Advanced RAG
11  Code RAG

AGENTS
12  Tools
13  LangChain
14  LangGraph
15  Memory
16  GitHub
17  Incremental indexing
18  MCP
19  Human approval
20  Multi-agent

ADVANCED AI
21  Multimodal
22  Web Research
23  GraphRAG
24  Deep Research

SECURITY
25  Authentication
26  Authorization
27  Guardrails

AI QUALITY
28  Evaluation
29  Observability
30  Model Routing
31  Caching
32  Reliability

BACKEND
33  API Completion
34  Backend Testing

FRONTEND
35  Next.js
36  Chat UI
37  Knowledge Base
38  GitHub UI
39  Agent UI
40  Approval UI
41  Evaluation UI
42  Observability UI
43  E2E

DEVOPS
44  Local Docker
45  CI/CD
46  Production Review

INFRASTRUCTURE
47  Infrastructure Architecture
48  Production Docker
49  Kubernetes
50  Terraform
51  Secrets
52  Monitoring
53  Alerting
54  Logging
55  Distributed Tracing
56  Queue Operations
57  Database Operations
58  Disaster Recovery
59  Security Operations
60  FinOps
61  Scaling
62  Production Deployment
63  SRE / Incident Management
```

That gives you a much more complete **AI platform engineering curriculum**: you're not just learning LangChain/RAG/LangGraph, but also the infrastructure, reliability, security, observability, and operational practices needed to actually run those systems.
