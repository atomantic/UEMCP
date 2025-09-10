# Repository Guidelines

## Project Structure & Modules
- `server/`: TypeScript MCP server (src, tests, dist). Build, lint, typecheck live here.
- `plugin/`: Unreal Engine plugin (Python ops, C++ stub, uplugin). Python lives under `plugin/Content/Python`.
- `tests/`: Integration/E2E helpers and scenarios; Python test example under `tests/python`.
- `scripts/`: Local diagnostics and utilities (e.g., `mcp-diagnostic.js`, `bump-version.js`).
- `docs/`, `README.md`, `CLAUDE.md`: Architecture, workflows, contributor info.

## Build, Test, Run
- Install/setup: `./setup.sh` (detects Node, builds server, configures MCP clients).
- Dev server: `npm run dev` (from repo root; runs `server` in watch mode).
- Build: `npm run build` (invokes `tsc` in `server`).
- Tests (root):
  - `npm test` or `npm run test:e2e` — E2E suite.
  - `npm run test:unit` — Jest unit tests in `server`.
  - `npm run test:integration` — Integration checks.
  - `cd server && npm run test:python` — Python plugin tests via pytest.
  - CI-like run: `./test-ci-locally.sh`.

## Coding Style & Naming
- Indentation: JS/TS/JSON 2 spaces; Python 4 spaces (`.editorconfig`).
- TypeScript: ESLint + strict rules (`server/.eslintrc.js`): no `any`, explicit returns, no unused vars, no floating promises. Run `npm run lint` and `npm run lint:fix`.
- Filenames: kebab- or lowerCamel for TS files; Python modules snake_case under `plugin/Content/Python`.
- Public tool exports live in `server/src/tools` and are registered via `server/src/index.ts`.
- Error handling: Avoid `try/catch` (TS) and `try/except` (Py) whenever possible. Prefer validation + specific errors and the UEMCP framework decorators/utilities. See `docs/development/error-handling-philosophy.md`, `docs/improved-error-handling.md`, and `docs/development/code-standards.md`.
- Linting standard: Zero warnings and zero errors. TS: `cd server && npm run lint`. Python: `flake8` in `plugin/Content/Python` with `--max-line-length=120`. Do not merge code with any lint output.

## Testing Guidelines
- Frameworks: Jest (TS), Pytest (plugin). Aim to keep unit tests in `server/tests` and Python tests in `server/tests/python`.
- Naming: `*.test.ts` for Jest; `test_*.py` for Pytest.
- Coverage: use `npm run test:e2e:coverage` or `cd server && npm run test:coverage`.

## Commits & PRs
- Commit style: Conventional Commits (e.g., `feat:`, `fix:`, `style:`) with clear scope; reference PRs/issues when applicable.
- PRs should include: concise description, linked issues, testing evidence (logs/screenshots), and updated docs if behavior changes. Ensure `./test-ci-locally.sh` passes.

## Security & Config Tips
- Set `UE_PROJECT_PATH` to your `.uproject` location for local runs.
- Claude Desktop config is auto-managed by `setup.sh`; regenerate if paths change.
- Prefer symlink install for plugin development when supported (`./setup.sh --symlink`).
