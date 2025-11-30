# Project: Reflectie AI - Personal Finance Tracker

## General
- We're on windows and not using python, focus on using powershell

## Tech Stack
- Svelte 5 with runes ($state, $derived, $effect, $props)
- TypeScript with strict types
- DaisyUI + Tailwind CSS
- Prisma ORM
- SvelteKit

## Code Style
- **Titles/Headings**: Always use sentence case (only first word capitalized). Never title case.
- **Naming**: camelCase (vars/functions), PascalCase (components/types), kebab-case (files)
- **Formatting**: Follow existing patterns, use Prettier defaults
- **DRY**: Reuse code, avoid duplication, extract common logic

## Svelte 5 Patterns
- Use runes: `$state`, `$derived`, `$effect`, `$props`
- Prefer `$derived.by()` for complex computations
- Use `{@const}` for template-level constants
- Avoid `onMount` when `$effect` works
- Use `$props()` for component props

## TypeScript
- Always type function parameters and return values
- Use proper types from Prisma client
- Avoid `any`, use `unknown` if type is truly unknown
- Define types at top of file or in separate types file

## Error Handling
- Always handle errors in async functions with try/catch
- Provide meaningful error messages to users
- Log errors to console for debugging
- Never silently fail

## UI/UX
- Use DaisyUI components (btn, card, modal, etc.)
- Follow existing design patterns
- Keep components focused and small (<200 lines)
- Use semantic HTML elements
- Ensure accessibility (proper labels, ARIA when needed)

## API/Backend
- Validate all inputs with Zod schemas
- Return consistent JSON responses
- Use proper HTTP status codes
- Check authentication before protected routes
- Handle edge cases (null, undefined, empty arrays)

## Database
- Use Prisma for all DB operations
- Always handle transactions properly
- Check for existing records before creating
- Use proper indexes for queries
- Handle foreign key constraints

## Best Practices
- Write self-documenting code (clear names > comments)
- Keep functions small and single-purpose
- Prefer composition over inheritance
- Test edge cases and error paths
- Update related code when making changes

## When Editing
- Read existing code patterns first
- Match existing style and structure
- Update related files if needed
- Check for breaking changes
- Verify no linter errors remain

## Planning & Discussion
- **ALWAYS discuss and plan first before implementing anything**
- Present the approach, get user approval, then implement
- Break down complex tasks into clear steps
- Explain trade-offs and alternatives when relevant

