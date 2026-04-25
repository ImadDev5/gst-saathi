# OpenCode — Docs snapshot (fetched 2026-04-25)

## Intro

OpenCode is an open-source AI coding agent available as a TUI, desktop app, or IDE extension.

**Prerequisites**

- Modern terminal (WezTerm, Alacritty, Kitty, etc.)
- API keys for LLM providers you intend to use

## Install

Recommended (general):

```bash
curl -fsSL https://opencode.ai/install | bash
```

Windows (recommended via WSL):

- WSL preferred for best compatibility
- Chocolatey: `choco install opencode`
- Scoop: `scoop install opencode`
- NPM: `npm install -g opencode-ai`
- Docker: `docker run -it --rm ghcr.io/anomalyco/opencode`

## Configure

- Configure LLM provider API keys (use `/connect` in the TUI and follow `opencode.ai/auth`)
- OpenCode Zen is a curated list of tested models: https://opencode.ai/docs/zen

## Initialize

Usage example in a project:

```bash
cd /path/to/project
opencode
/init   # analyze project and create AGENTS.md
```

Commit the generated `AGENTS.md` to help OpenCode understand your repo.

## Usage highlights

- Ask questions and fuzzy-search files using `@` key
- Plan mode: switch to Plan (Tab) to get non-destructive implementation plans
- Build mode: switch back to Build (Tab) to apply changes
- `/undo` and `/redo` are available to revert or reapply changes

## Additional Links

- Docs: https://opencode.ai/docs/
- Windows WSL guide: https://opencode.ai/docs/windows-wsl
- Providers: https://opencode.ai/docs/providers/
- MCP servers: https://opencode.ai/docs/mcp-servers/
- GitHub: https://github.com/anomalyco/opencode

---

Last updated: Apr 24, 2026

This file is a local snapshot of the OpenCode docs page (not an official mirror). For the live docs visit https://opencode.ai/docs/
