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

## Tools

| Tool | Description |
|------|-------------|
| `enter_world(parcel)` | Get scene info for any DCL parcel |
| `observe(parcel)` | Observe current parcel |
| `explore(agentId, baseParcel)` | Autonomously discover unvisited scenes, classify and evaluate them |
| `register_scene(parcel, name, category)` | Make your scene discoverable to AI agents |
| `record_visit(agentId, parcel, outcome)` | Record agent activity to Lowdown |

## Autonomous Agent

Run a self-scheduling agent that explores DCL every hour:

```bash
LOWDOWN_API_URL=https://lowdown-proxy.vercel.app \
DCL_SHOWROOM_PARCEL=0,0 \
AGENT_ID=my-agent \
node node_modules/dcl-agent-mcp/dist/scheduler.js
```

## Limitations

- No physical avatar movement yet (requires DCL Explorer in development mode)
- Exploration is logical, not visual
- Decentraland only for now

## Related

- [Lowdown](https://lowdown-proxy.vercel.app) — Agent reputation and activity layer
- [GitHub](https://github.com/PetShopBros/dcl-agent-mcp)