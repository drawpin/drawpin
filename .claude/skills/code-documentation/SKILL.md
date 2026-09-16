---
name: code-documentation
description: Writing production-level code documentation: READMEs, TSDoc/API docs, OpenAPI, inline comments, ADRs. Use whenever writing or changing code, APIs, or developer guides.
---

# Code Documentation

Source: wshobson/agents (MIT license, v4.1.0), with DrawPin project rules added.

## Project rules (apply on every code change)

1. **Docs ship with code.** Any change that adds or modifies behavior updates the related docs in the same commit/PR. A PR is not done if docs are stale.
2. **Every exported function, component, hook, type, and interface gets a TSDoc block** (summary, `@param`, `@returns`, `@throws` where relevant, `@example` for non-trivial APIs). Internal helpers get TSDoc only when their purpose isn't obvious from the name and signature.
3. **Every API route handler** is described in `docs/api/openapi.yaml` (request body, responses, error codes) and has a TSDoc block pointing to its OpenAPI path.
4. **Inline comments explain WHY, never WHAT.** Business rules reference the decision (e.g. "1 post per device per day — docs/PLAN.md, Tiles"). Workarounds use `HACK:` / `TODO:` with a tracking link or issue number.
5. **Architecture decisions** get an ADR in `docs/adr/NNN-title.md` (Status, Context, Decision, Rationale, Consequences). Never edit an accepted ADR's decision; supersede it with a new ADR.
6. **Modules/features** with more than a couple of files get a component doc (Overview, Flow, Dependencies, Configuration), either as a `README.md` in that folder or in `docs/components/`.
7. **Configuration**: every environment variable is listed in `.env.example` and in the README Configuration table (name, required, default, description). Never document real secret values.
8. **Database**: every migration has a header comment explaining what it changes and why; table/column purposes are documented with `COMMENT ON` or in `docs/ERD.md`.
9. **Root README** follows the template below and stays runnable: Quick Start commands must work on a fresh clone.
10. **Remove, don't leave stale:** delete comments/docs that no longer match the code.

## README Structure

### Standard README Template
```markdown
# Project Name

Brief description of what this project does.

## Quick Start

\`\`\`bash
npm install
npm run dev
\`\`\`

## Installation

Detailed installation instructions...

## Usage

\`\`\`typescript
import { something } from 'project';

// Example usage
const result = something.doThing();
\`\`\`

## API Reference

### `functionName(param: Type): ReturnType`

Description of what the function does.

**Parameters:**
- `param` - Description of parameter

**Returns:** Description of return value

**Example:**
\`\`\`typescript
const result = functionName('value');
\`\`\`

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `option1` | `string` | `'default'` | What it does |

## Contributing

How to contribute...

## License

MIT
```

## API Documentation

### JSDoc/TSDoc Style
```typescript
/**
 * Creates a new user account.
 *
 * @param userData - The user data for account creation
 * @param options - Optional configuration
 * @returns The created user object
 * @throws {ValidationError} If email is invalid
 * @example
 * ```ts
 * const user = await createUser({
 *   email: 'user@example.com',
 *   name: 'John'
 * });
 * ```
 */
async function createUser(
  userData: UserInput,
  options?: CreateOptions
): Promise<User> {
  // Implementation
}

/**
 * Configuration options for the API client.
 */
interface ClientConfig {
  /** The API base URL */
  baseUrl: string;
  /** Request timeout in milliseconds @default 5000 */
  timeout?: number;
  /** Custom headers to include in requests */
  headers?: Record<string, string>;
}
```

### OpenAPI/Swagger
```yaml
openapi: 3.0.0
info:
  title: My API
  version: 1.0.0

paths:
  /users:
    post:
      summary: Create a user
      description: Creates a new user account
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UserInput'
      responses:
        '201':
          description: User created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '400':
          description: Invalid input

components:
  schemas:
    UserInput:
      type: object
      required:
        - email
        - name
      properties:
        email:
          type: string
          format: email
        name:
          type: string
    User:
      type: object
      properties:
        id:
          type: string
        email:
          type: string
        name:
          type: string
        createdAt:
          type: string
          format: date-time
```

## Inline Comments

### When to Comment
```typescript
// GOOD: Explain WHY, not WHAT

// Use binary search because the list is always sorted and
// can contain millions of items - O(log n) vs O(n)
const index = binarySearch(items, target);

// GOOD: Explain complex business logic
// Users get 20% discount if they've been members for 2+ years
// AND have made 10+ purchases (per marketing team decision Q4 2024)
if (user.memberYears >= 2 && user.purchaseCount >= 10) {
  applyDiscount(0.2);
}

// GOOD: Document workarounds
// HACK: Safari doesn't support this API, fallback to polling
// TODO: Remove when Safari adds support (tracking: webkit.org/b/12345)
if (!window.IntersectionObserver) {
  startPolling();
}
```

### When NOT to Comment
```typescript
// BAD: Stating the obvious
// Increment counter by 1
counter++;

// BAD: Explaining clear code
// Check if user is admin
if (user.role === 'admin') { ... }

// BAD: Outdated comments (worse than no comment)
// Returns the user's full name  <-- Actually returns email now!
function getUserIdentifier(user) {
  return user.email;
}
```

## Architecture Documentation

### ADR (Architecture Decision Record)
```markdown
# ADR-001: Use PostgreSQL for Primary Database

## Status
Accepted

## Context
We need a database for storing user data and transactions.
Options considered: PostgreSQL, MySQL, MongoDB, DynamoDB.

## Decision
Use PostgreSQL with Supabase hosting.

## Rationale
- Strong ACID compliance needed for financial data
- Team has PostgreSQL experience
- Supabase provides auth and realtime features
- pgvector extension for future AI features

## Consequences
- Need to manage schema migrations
- May need read replicas for scale
- Team needs to learn Supabase-specific features
```

### Component Documentation
```markdown
## Authentication Module

### Overview
Handles user authentication using JWT tokens with refresh rotation.

### Flow
1. User submits credentials to `/auth/login`
2. Server validates and returns access + refresh tokens
3. Access token used for API requests (15min expiry)
4. Refresh token used to get new access token (7d expiry)

### Dependencies
- `jsonwebtoken` - Token generation/validation
- `bcrypt` - Password hashing
- `redis` - Refresh token storage

### Configuration
- `JWT_SECRET` - Secret for signing tokens
- `ACCESS_TOKEN_EXPIRY` - Access token lifetime
- `REFRESH_TOKEN_EXPIRY` - Refresh token lifetime
```

## Documentation Principles

1. **Write for your audience** - New devs vs API consumers
2. **Keep it close to code** - Docs in same repo, near relevant code
3. **Update with code** - Stale docs are worse than none
4. **Examples over explanations** - Show, don't just tell
5. **Progressive disclosure** - Quick start first, details later

## Pre-merge documentation checklist

- [ ] Exported symbols have TSDoc
- [ ] New/changed API routes reflected in `docs/api/openapi.yaml`
- [ ] New env vars in `.env.example` + README Configuration table
- [ ] Migrations have header comments; ERD doc updated if schema changed
- [ ] ADR added for any architecture decision
- [ ] README Quick Start still works
- [ ] No stale or "what" comments left behind
