# Documentation Rules

## Code Documentation
- JSDoc for all public APIs (functions, classes, interfaces)
- README.md in each package with: purpose, install, usage, API
- ADR for architectural decisions (see `decisions/` collection)

## Commit Messages
- Conventional Commits: `type(scope): description`
- Types: feat, fix, docs, style, refactor, test, chore
- Reference issues: `Closes #123`

## PR Descriptions
- What changed (bullet list)
- Why (context, issue link)
- How to test
- Screenshots for UI changes
- Breaking changes noted

## API Documentation
- OpenAPI/Swagger for REST APIs
- GraphQL schema with descriptions
- gRPC proto with comments
- Examples for each endpoint