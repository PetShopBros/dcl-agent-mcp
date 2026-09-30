# dcl-agent-mcp

> Give your AI agents a body in Decentraland.

An MCP server that lets AI agents autonomously explore Decentraland, classify scenes, evaluate relevance, and record activity to [Lowdown](https://lowdown-proxy.vercel.app).

## Install

```bash
npm install dcl-agent-mcp
```

## Claude Desktop Config

```json
{
  "mcpServers": {
    "dcl-agent-mcp": {
      "command": "node",
      "args": ["node_modules/dcl-agent-mcp/dist/server.js"],
      "env": {
        "LOWDOWN_API_URL": "https://lowdown-proxy.vercel.app"
      }
    }
  }
}
```

## Pulse Presence (Real Avatar)

To use `enter_world`, `move`, `get_position`, `observe_world`, `disconnect_world` — tools that give your agent a real avatar body in DCL — you need the Pulse bridge:

### 1. Build DCLPulseTestClient

```bash
git clone https://github.com/PetShopBros/dcl-agent-mcp
cd pulse-test/DCLPulseTestClient/src/DCLPulseTestClient
dotnet build
```

Requires [.NET 10 SDK](https://dotnet.microsoft.com/download).

### 2. Generate auth keys

```bash
cd pulse-test
npm install
node generate-auth.js
```

This creates `auth-chain.json` and `ephemeral-key.json` in `pulse-test/`.

### 3. Add env vars to Claude Desktop config

```json
{
  "mcpServers": {
    "dcl-agent-mcp": {
      "command": "node",
      "args": ["node_modules/dcl-agent-mcp/dist/server.js"],
      "env": {
        "LOWDOWN_API_URL": "https://lowdown-proxy.vercel.app",
        "PULSE_EXE_PATH": "/path/to/DCLPulseTestClient.exe",
        "PULSE_AUTH_DIR": "/path/to/pulse-test",
        "PULSE_SERVER_IP": "pulse-server.decentraland.org",
        "PULSE_SERVER_PORT": "7777",
        "PULSE_REALM": "main"
      }
    }
  }
}
```

Without Pulse setup, REST-only tools (`observe`, `explore`, `record_visit`, `register_scene`) still work.

## Tools

| Tool | Requires Pulse | Description |
|------|---------------|-------------|
| `enter_world(parcel)` | ✅ | Enter DCL with a real avatar + get scene info |
| `get_position()` | ✅ | Get current avatar coordinates |
| `move(x, y, z)` | ✅ | Teleport avatar to world coordinates |
| `observe_world()` | ✅ | Observe avatar state + scene info |
| `disconnect_world()` | ✅ | Disconnect avatar from DCL |
| `observe(parcel)` | ❌ | Get scene info via REST |
| `explore(agentId, baseParcel)` | ❌ | Autonomously discover unvisited scenes |
| `register_scene(parcel, name, category)` | ❌ | Make your scene discoverable to AI agents |
| `record_visit(agentId, parcel, outcome)` | ❌ | Record agent activity to Lowdown |

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
- Decentraland only for now

## Related

- [Lowdown](https://lowdown-proxy.vercel.app) — Agent reputation and activity layer
- [GitHub](https://github.com/PetShopBros/dcl-agent-mcp)