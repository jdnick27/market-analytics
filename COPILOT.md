
# Copilot / Coding Agent notes

This file explains how to interact with an automated coding agent (Copilot) for this repository.

How to request work from the Copilot coding agent

- Add a clear task description. If you want the agent to implement changes and open a PR, include the tag:

	`#github-pull-request_copilot-coding-agent`

- Include the target branch name or leave it to the agent to create `copilot/<short-desc>`.

What the agent will do

- Create a branch, implement edits, run repository-local checks (if possible), and open a PR with a description of the changes.
- The agent will not commit secrets. It will reference environment variables and expect the reviewer to configure secrets in CI or `.env` locally.

Required human verification before merging

- Build and type-check locally: `npm install` and `npx tsc -p tsconfig.json` (if a build step exists).
- Run the project or tests: currently `npm run test` (this project uses `ts-node src/index.ts` by default).
- Confirm no secrets or API keys were committed.

Recommended CI checks (if you add CI)

- `npm ci` / `npm install`
- `npx tsc -p tsconfig.json`
- Run unit tests (if added)

Local developer quick commands

- Install deps:
```bash
npm install
```
- Run the project (dev/test command defined in package.json):
```bash
npm run test
```

Notes

- The agent follows `tsconfig.json` and repository conventions. If you want different behavior (for example, to compile to `dist/` and run the compiled file), make that explicit in the request.
- Always review changes from the agent. Automated agents speed up work but cannot replace domain knowledge and review.

