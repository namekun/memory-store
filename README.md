# memory-store

Local SQLite-based cross-session memory store.
Save and search data across sessions from any environment — AI agents, CLI, scripts, or cron jobs.

[한국어 문서](README.ko.md)

## Features

- Single SQLite file, no separate DB server required
- CLI works anywhere: Claude Code, OpenClaw, terminal, cron, scripts
- Category and tag-based organization
- On-demand retrieval keeps context windows lean
- Stdin support for storing long content

## Requirements

- [Bun](https://bun.sh) 1.0+

## Install

```bash
git clone https://github.com/namekun/memory-store.git
cd memory-store

chmod +x bin/memory-tool

# Optional: add to PATH
ln -s $(pwd)/bin/memory-tool ~/.local/bin/memory-tool
```

The SQLite DB file is created automatically on first run.

## Usage

```bash
# Save (upserts if key exists)
memory-tool save <key> <value> [--category <cat>] [--tags <tags>]

# Get by key
memory-tool get <key>

# Search across keys, values, and tags
memory-tool search <query> [--category <cat>] [--limit <n>]

# List by category (omit to see all category stats)
memory-tool list [category]

# Delete
memory-tool delete <key>

# DB statistics
memory-tool stats
```

## Examples

```bash
# Record a decision
memory-tool save auth-method "Chose session cookies over JWT because..." --category decision --tags "auth,security"

# Save debug history
memory-tool save cors-error-fix "Root cause: missing proxy config..." --category debug --tags "cors,nginx"

# Save cron job results
memory-tool save tech-news-2026-04-01 "Top news today: ..." --category cron --tags "news,daily"

# Search
memory-tool search auth
memory-tool search "proxy" --category debug

# List by category
memory-tool list decision

# Pipe long content via stdin
echo "Long content..." | memory-tool save my-key --category general
```

## AI Agent Integration

### Claude Code

Add to CLAUDE.md:
```
Use memory-tool CLI for cross-session data.
- Save: `memory-tool save <key> <value> --category <cat>`
- Search: `memory-tool search <query>`
```

### OpenClaw

Add to exec allowlist:
```bash
openclaw approvals allowlist add --agent pochita "/path/to/memory-store/bin/memory-tool"
```

Then use via `system.run` in agent TOOLS.md:
```
system.run: ["memory-tool", "save", "key", "value", "--category", "cron"]
system.run: ["memory-tool", "search", "keyword"]
```

### Other AI Tools (Codex, Gemini, etc.)

Works with any AI tool that has terminal access.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MEMORY_STORE_DB_PATH` | `~/.claude/mcp-servers/memory-store/data/memory.db` | SQLite DB file path |

## Tech Stack

- [Bun](https://bun.sh) + `bun:sqlite` (built-in SQLite)

## License

MIT
