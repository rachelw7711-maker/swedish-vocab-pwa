# AI Agent Development Rules

This is an AI-assisted development project for a Swedish vocabulary PWA.

## Default Rules

- Make the smallest change that solves the task.
- Analyze the existing code, data shape, and UI behavior before modifying files.
- Explain which files changed after completing a task.
- Do not delete files unless the user explicitly asks for it.
- Do not rewrite or refactor the whole project casually.
- Prefer existing patterns in `app.js`, `styles.css`, `index.html`, `server.mjs`, and the data files.
- Keep user data, IndexedDB behavior, localStorage keys, and PWA install/offline behavior stable unless the task explicitly targets them.
- Avoid unrelated formatting churn.

## Agent Role Files

Role-specific rules live in the `agents/` folder:

- `agents/ui-agent.md`
- `agents/data-agent.md`
- `agents/test-agent.md`
- `agents/content-agent.md`
- `agents/pwa-agent.md`
- `agents/animation-agent.md`
- `agents/brand-agent.md`

Use the narrowest suitable agent for each task. If a task spans multiple roles, document the boundaries and keep each change scoped.
