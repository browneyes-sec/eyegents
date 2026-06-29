# MCP Tools Reference

Complete reference for all tools exposed by the eyegents MCP server.

## Tool Categories

| Category | Tools | Purpose |
|----------|-------|---------|
| Vector | `vector_search`, `vector_upsert`, `code_search`, `decision_search`, `skill_pattern_search` | Semantic search and storage |
| GitHub | `github_create_pr`, `github_get_pr`, `github_post_review`, `github_search_code`, `github_get_issues`, `github_create_issue` | Repository operations |
| Filesystem | `fs_read`, `fs_write`, `fs_glob`, `fs_grep`, `fs_stat`, `fs_list` | File operations |
| Shell | `shell_exec` | Command execution (allowlisted) |
| Skills | `skill_execute`, `skill_list`, `skill_get_pattern` | Skill workflow execution |
| OpenRouter | `openrouter_complete`, `openrouter_health`, `openrouter_models`, `openrouter_costs`, `openrouter_routes` | Remote LLM integration |

---

## Vector Tools

### `vector_search`

Hybrid semantic + keyword search across all vector collections.

```json
{
  "query": "authentication middleware",
  "collections": ["code_chunks", "decisions"],
  "limit": 10
}
```

### `vector_upsert`

Store data in the vector database. Generates embeddings automatically if not provided.

```json
{
  "type": "decision",
  "data": {
    "context": "Need rate limiting for API",
    "rationale": "Prevent abuse and ensure fair usage",
    "outcome": "Implement token bucket with Redis",
    "tags": ["architecture", "api", "security"],
    "author": "backend"
  }
}
```

**Types**: `code_chunk`, `conversation`, `decision`, `skill_pattern`

### `code_search`

Search codebase with language filtering.

```json
{
  "query": "validate input parameters",
  "languages": ["typescript"],
  "limit": 10
}
```

### `decision_search`

Search architectural decisions.

```json
{
  "query": "database choice",
  "limit": 5
}
```

### `skill_pattern_search`

Search skill patterns for few-shot examples.

```json
{
  "skillName": "code-review",
  "query": "security audit",
  "limit": 3
}
```

---

## GitHub Tools

### `github_create_pr`

Create a pull request.

```json
{
  "title": "feat: add rate limiting",
  "body": "Implements token bucket algorithm...",
  "head": "feature/rate-limiting",
  "base": "main",
  "draft": false
}
```

### `github_get_pr`

Get PR details, files, and reviews.

```json
{
  "prNumber": 42
}
```

### `github_post_review`

Post a review comment on a PR.

```json
{
  "prNumber": 42,
  "body": "LGTM! Clean implementation.",
  "event": "APPROVE",
  "comments": [
    {
      "path": "src/middleware.ts",
      "line": 15,
      "body": "Consider adding rate limit headers here"
    }
  ]
}
```

**Events**: `COMMENT`, `APPROVE`, `REQUEST_CHANGES`

### `github_search_code`

Search code across the repository.

```json
{
  "query": "validateToken",
  "perPage": 10
}
```

### `github_get_issues`

List or search issues.

```json
{
  "state": "open",
  "labels": ["bug", "security"],
  "perPage": 20
}
```

### `github_create_issue`

Create a new issue.

```json
{
  "title": "Add input validation",
  "body": "All user inputs should be validated...",
  "labels": ["enhancement", "security"],
  "assignees": ["pablo"]
}
```

---

## Filesystem Tools

### `fs_read`

Read file content with optional line range.

```json
{
  "path": "src/index.ts",
  "startLine": 1,
  "endLine": 50
}
```

### `fs_write`

Write file (creates parent directories automatically).

```json
{
  "path": "src/utils/new.ts",
  "content": "export const helper = () => {};",
  "mode": "0644"
}
```

### `fs_glob`

Glob pattern match files.

```json
{
  "pattern": "src/**/*.ts",
  "cwd": "."
}
```

### `fs_grep`

Search file contents with regex (ripgrep-style).

```json
{
  "pattern": "TODO|FIXME",
  "include": "*.ts",
  "cwd": "src/"
}
```

### `fs_stat`

Get file metadata.

```json
{
  "path": "package.json"
}
```

### `fs_list`

List directory contents.

```json
{
  "path": "src/"
}
```

---

## Shell Tools

### `shell_exec`

Execute shell commands. Only allowlisted commands are permitted.

```json
{
  "command": "npm",
  "args": ["test"],
  "timeout": 60000
}
```

**Allowlisted commands**:

```
npm, pnpm, yarn, node, npx
git, docker, docker-compose
kubectl, helm, terraform
python, pip, python3
go, cargo, rustc
make, cmake
curl, wget, jq
ls, cat, grep, find, head, tail, wc
ps, top, df, du, free
```

Commands are validated against the allowlist before execution. Unknown commands throw an error.

---

## Skill Tools

### `skill_execute`

Execute a skill workflow with context retrieval. Retrieves relevant patterns from the vector database and returns them as few-shot context.

```json
{
  "skillName": "code-review",
  "task": "Review authentication module for security vulnerabilities",
  "context": {
    "language": "typescript",
    "framework": "express"
  }
}
```

### `skill_list`

List all available skills in the vector database.

```json
{}
```

### `skill_get_pattern`

Get a specific skill pattern by ID.

```json
{
  "id": "skill-pattern-001"
}
```

---

## OpenRouter Tools

### `openrouter_complete`

Complete a prompt using OpenRouter. Automatically routes to the optimal model based on agent role and task complexity.

```json
{
  "prompt": "Implement a JWT authentication middleware",
  "agentRole": "backend",
  "taskComplexity": "complex",
  "temperature": 0.7,
  "maxTokens": 4096
}
```

**Agent roles**: `orchestrator`, `backend`, `frontend`, `qa`, `ops`, `fullstack`, `certifier`

**Response**:
```json
{
  "content": "...",
  "model": "deepseek/deepseek-v4-flash",
  "provider": "openrouter",
  "cost": 0.0012,
  "usage": { "promptTokens": 150, "completionTokens": 320 }
}
```

### `openrouter_health`

Check OpenRouter API connectivity.

```json
{}
```

### `openrouter_models`

List available models and their configuration.

```json
{}
```

### `openrouter_costs`

Get session cost summary and usage breakdown.

```json
{}
```

### `openrouter_routes`

Show agent-to-model routing configuration.

```json
{}
```
