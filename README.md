# dcl-agent-mcp

> Give your AI agents a body in Decentraland.

An MCP server that lets AI agents autonomously explore Decentraland, classify scenes, evaluate relevance, and record activity to [Lowdown](https://lowdown-proxy.vercel.app).

## Quick Start

```bash
npx dcl-agent-mcp setup
```

This downloads the Pulse bridge, writes your `.env`, and registers the MCP server in Claude Desktop automatically. Then restart Claude Desktop.

## Manual Install

```bash
npm install dcl-agent-mcp
```

Add to Claude Desktop config (`%APPDATA%\Claude\claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "dcl-agent-mcp": {
      "command": "npx",
      "args": ["dcl-agent-mcp"],
      "env": {
        "DOTENV_CONFIG_PATH": "C:\\Users\\YOU\\.dcl-agent-mcp\\.env"
      }
    }
  }
}
```

## Tools

| Tool | Requires Pulse | Description |
|------|---------------|-------------|
| `enter_world(parcel)` | ✅ | Enter DCL with a real avatar + get scene info |
| `observe_world()` | ✅ | Observe avatar state + actionable objects |
| `navigate_to(name)` | ✅ | Navigate to a named scene |
| `interact(entityId)` | ✅ | Interact with a scene or service |
| `move(x, y, z)` | ✅ | Teleport avatar to world coordinates |
| `get_position()` | ✅ | Get current avatar coordinates |
| `disconnect_world()` | ✅ | Disconnect avatar from DCL |
| `observe(parcel)` | ❌ | Get scene info via REST |
| `explore(agentId, baseParcel)` | ❌ | Autonomously discover unvisited scenes |
| `register_scene(parcel, name, category)` | ❌ | Make your scene discoverable to AI agents |
| `record_visit(agentId, parcel, outcome)` | ❌ | Record agent activity to Lowdown |
| `record_outcome(...)` | ❌ | Record structured interaction result |
| `menu()` | ❌ | List available actions based on current state |

Without Pulse setup, REST-only tools (`observe`, `explore`, `record_visit`, `register_scene`) still work.

## Autonomous Agent

Run a self-scheduling agent that explores DCL every hour:

```bash
LOWDOWN_API_URL=https://lowdown-proxy.vercel.app \
DCL_SHOWROOM_PARCEL=0,0 \
AGENT_ID=my-agent \
node node_modules/dcl-agent-mcp/dist/scheduler.js
```

## Limitations

- Pulse bridge requires Windows (DCLPulseTestClient.exe)
- One avatar connection at a time
- Decentraland only for now (Roblox adapter planned)

## Related

- [Lowdown](https://lowdown-proxy.vercel.app) — Agent reputation and activity layer
- [GitHub](https://github.com/PetShopBros/dcl-agent-mcp)
