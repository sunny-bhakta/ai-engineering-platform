# AI Platform — Master Context Prompt

You are working on the same ongoing project across ChatGPT sessions.

## Project

We are building a production-oriented AI Engineering Platform called `ai-engineering-platform`.

Goal: learn and implement modern AI engineering concepts in one coherent TypeScript monorepo.

The platform will eventually support:

- LLM providers, streaming, structured outputs, prompt management
- embeddings, vector search, RAG, advanced RAG, hybrid search, reranking, citations
- tool calling, LangChain, LangGraph, agent workflows, memory, human-in-the-loop
- MCP, multi-agent systems
- GitHub, Slack, Jira, database tools, web search
- multimodal AI, GraphRAG, deep research
- guardrails, prompt-injection protection
- authentication, authorization, multi-tenancy
- evaluation, observability, cost tracking
- model routing, caching, queues, workers
- testing, Docker, CI/CD, production deployment

## Architecture

Backend first. Implement the Next.js frontend later.

Do NOT redesign the architecture unless there is a strong technical reason.

Keep AI functionality in reusable packages; do not put all AI logic in `apps/api`.

## Monorepo

Use:

- pnpm workspaces
- TypeScript + strict mode
- Node.js
- Vitest
- Docker
- PostgreSQL + pgvector
- Redis

Expected structure:

```text
apps/
  api/
  worker/
  ingestion/
  web/              # later

packages/
  ai/
  agents/
  rag/
  vector-store/
  tools/
  mcp/
  memory/
  database/
  auth/
  guardrails/
  evaluation/
  observability/
  queue/
  cache/
  storage/
  shared/
  config/

tests/
  e2e/
  integration/
  evaluation/
  fixtures/

infrastructure/
  docker/
  kubernetes/
  terraform/
  monitoring/

docs/
scripts/
## Architecture & Ownership

- `apps/api` — HTTP/application orchestration.
- `packages/*` — isolated reusable capabilities:
  - `ai` — model/provider abstraction
  - `rag` — RAG
  - `vector-store` — vector DB operations
  - `agents` — LangGraph workflows
  - `tools` — application tools
  - `mcp` — MCP
  - `memory` — AI memory
  - `database` — DB access
  - `auth` — authentication/authorization
  - `guardrails` — AI safety
  - `evaluation` — AI evaluation
  - `observability` — tracing/metrics/AI usage
  - `queue` — queues
  - `cache` — caching
  - `shared` — genuinely shared types/schemas/utilities only
- No duplicated functionality or circular dependencies.
- Dependency flow: `apps/api → packages/* → infrastructure`.
- Packages must never depend on `apps/api`.

## Infrastructure

- PostgreSQL + pgvector for embeddings.
- Redis for caching/background jobs.
- Docker Compose for local infrastructure.
- Local-first development.
- No Kubernetes/cloud infrastructure unless explicitly requested.

## Testing & Code

- Vitest for unit/integration tests.
- Playwright later for browser E2E.
- Every implementation includes appropriate tests.
- Use strict, production-quality TypeScript; avoid clever abstractions.
- Validate all external/user/LLM-generated data.
- Never trust LLM-generated tool arguments.

## Change & Implementation Rules

Before changing code:
- Inspect the existing repository.
- Reuse existing abstractions/files.
- Never recreate existing files unnecessarily.
- Preserve compatibility with previous blocks.
- Never silently change architecture; explain required architectural changes first.

For every implementation:
- List files to create/change.
- Provide complete changed-file code.
- Explain key technical/architectural decisions.
- Include tests, run commands, required env vars, Docker dependencies, and verification steps.
- Do not implement future blocks prematurely.

Build incrementally, one block at a time.
```
