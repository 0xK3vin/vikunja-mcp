```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│    ██╗   ██╗██╗██╗  ██╗██╗   ██╗███╗   ██╗     ██╗ █████╗  │
│    ██║   ██║██║██║ ██╔╝██║   ██║████╗  ██║     ██║██╔══██╗ │
│    ██║   ██║██║█████╔╝ ██║   ██║██╔██╗ ██║     ██║███████║ │
│    ╚██╗ ██╔╝██║██╔═██╗ ██║   ██║██║╚██╗██║██   ██║██╔══██║ │
│     ╚████╔╝ ██║██║  ██╗╚██████╔╝██║ ╚████║╚█████╔╝██║  ██║ │
│      ╚═══╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝ ╚════╝ ╚═╝  ╚═╝ │
│                        ███╗   ███╗ ██████╗██████╗          │
│                        ████╗ ████║██╔════╝██╔══██╗         │
│                        ██╔████╔██║██║     ██████╔╝         │
│                        ██║╚██╔╝██║██║     ██╔═══╝          │
│                        ██║ ╚═╝ ██║╚██████╗██║              │
│                        ╚═╝     ╚═╝ ╚═════╝╚═╝              │
│                                                            │
│    > MCP server for Vikunja task management                │
│    > Connect your AI assistant to your tasks               │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

[![Build](https://github.com/0xK3vin/vikunja-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/0xK3vin/vikunja-mcp/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@0xk3vin/vikunja-mcp.svg)](https://www.npmjs.com/package/@0xk3vin/vikunja-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)

---

## > ABOUT

Connect your AI assistant to [Vikunja](https://vikunja.io), the open-source task manager. This [MCP](https://modelcontextprotocol.io) server lets you manage projects, tasks, kanban boards, and more—just by asking. Works with Claude Desktop, OpenCode, Cursor, and other MCP clients.

```
WHY VIKUNJA-MCP?
────────────────────────────────────────────────────────────
  [+] Self-hosted friendly    Your data stays on your server
  [+] Full coverage           32 tools across all Vikunja APIs
  [+] Reliable                Retry logic with exponential backoff
  [+] Production ready        86 tests, 90%+ code coverage
  [+] Zero config             Works out of the box with npx
────────────────────────────────────────────────────────────
```

---

## > QUICK START

```bash
# Install
$ npm install -g @0xk3vin/vikunja-mcp

# Set environment variables
$ export VIKUNJA_URL="https://your-vikunja-instance.com"
$ export VIKUNJA_API_TOKEN="your_api_token"
```

### Claude Desktop Configuration

Add to your config file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "vikunja": {
      "command": "npx",
      "args": ["-y", "@0xk3vin/vikunja-mcp"],
      "env": {
        "VIKUNJA_URL": "https://your-vikunja-instance.com",
        "VIKUNJA_API_TOKEN": "your_api_token"
      }
    }
  }
}
```

---

## > FEATURES

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  [■] PROJECTS      Create, update, delete, archive      │
│  [■] TASKS         Full CRUD + filtering & sorting      │
│  [■] KANBAN        Buckets, move tasks, WIP limits      │
│  [■] LABELS        Create, attach, remove from tasks    │
│  [■] COMMENTS      Add and list task comments           │
│  [■] ATTACHMENTS   List and download (images inline)    │
│  [■] ASSIGNEES     Manage who's working on what         │
│  [■] RELATIONS     Subtasks, blocking, dependencies     │
│  [■] VIEWS         List, kanban, table, gantt           │
│  [■] TEAMS         List teams and members               │
│  [■] USERS         Search by name, username, email      │
│  [■] NOTIFICATIONS List user notifications              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## > CONFIGURATION

Copy `.env.example` to `.env` and configure:

```bash
VIKUNJA_URL=https://your-vikunja-instance.com
VIKUNJA_API_TOKEN=your_api_token
```

**Getting an API token:**
1. Log into your Vikunja instance
2. Go to **Settings** → **API Tokens**
3. Create a new token and copy it

---

## > DEVELOPMENT

```bash
$ git clone https://github.com/0xK3vin/vikunja-mcp.git
$ cd vikunja-mcp
$ npm install
$ npm run build
$ npm test
```

### Commands

| Command | Description |
|---------|-------------|
| `npm start` | Run the server |
| `npm test` | Run tests |
| `npm run build` | Build TypeScript |
| `npm run lint` | Lint code |
| `npm run inspect` | Debug with MCP Inspector |

---

## > DOCS

Full API reference: **[docs/API.md](docs/API.md)**

---

## > CONTRIBUTING

Contributions welcome! See **[CONTRIBUTING.md](CONTRIBUTING.md)** for guidelines.

---

## > LICENSE

MIT - see [LICENSE](LICENSE)

---

```
╔════════════════════════════════════════════════════════════╗
║  Made by 0xK3vin                                           ║
║  github.com/0xK3vin/vikunja-mcp                            ║
╚════════════════════════════════════════════════════════════╝
```
