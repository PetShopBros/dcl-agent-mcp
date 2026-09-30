import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import dotenv from 'dotenv'
import { enterWorld } from './tools/enterWorld.js'
import { observe } from './tools/observe.js'
import { recordVisit } from './tools/recordVisit.js'
import { explore } from './tools/explore.js'
import { registerScene } from './tools/registerScene.js'
import { pulseBridge } from './pulse/PulseBridge.js'
import { getParcelInfo } from './dcl/api.js'

dotenv.config()

const server = new McpServer({
  name: 'dcl-agent-mcp',
  version: '0.2.0',
})

// ── Pulse presence tools ─────────────────────────────────────────────────────

server.tool(
  'enter_world',
  'Enter a Decentraland parcel with a real avatar presence via Pulse protocol. Returns wallet, position, and scene info.',
  { parcel: z.string().describe('Parcel coordinates e.g. "46,115"') },
  async ({ parcel }) => {
    const result = await enterWorld(parcel)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
)

server.tool(
  'get_position',
  'Get current avatar position in the DCL world.',
  {},
  async () => {
    const result = await pulseBridge.getPosition()
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
)

server.tool(
  'move',
  'Move the avatar to specific world coordinates. To compute from parcel: x = parcel_x * 16 + 8, z = parcel_z * 16 + 8.',
  {
    x: z.number().describe('World X coordinate'),
    y: z.number().default(0).describe('World Y coordinate (height, usually 0)'),
    z: z.number().describe('World Z coordinate'),
  },
  async ({ x, y, z }) => {
    const result = await pulseBridge.move(x, y, z)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
)

server.tool(
  'observe_world',
  'Observe the current avatar state (wallet, position) and scene info at current location.',
  {},
  async () => {
    const pulse = await pulseBridge.observe()
    let scene = null

    if (pulse.ok && pulse.position) {
      // Convert world coords back to parcel for REST lookup
      const px = Math.floor(pulse.position.x / 16)
      const pz = Math.floor(pulse.position.z / 16)
      const info = await getParcelInfo(`${px},${pz}`)
      scene = info.scene
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ ...pulse, scene, timestamp: new Date().toISOString() }, null, 2),
        },
      ],
    }
  }
)

server.tool(
  'disconnect_world',
  'Gracefully disconnect the avatar from Decentraland.',
  {},
  async () => {
    const result = await pulseBridge.disconnect()
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
)

// ── REST / Lowdown tools ─────────────────────────────────────────────────────

server.tool(
  'observe',
  'Observe a parcel\'s scene and tile info via REST (no Pulse presence required).',
  { parcel: z.string().describe('Parcel coordinates e.g. "46,115"') },
  async ({ parcel }) => {
    const result = await observe(parcel)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
)

server.tool(
  'record_visit',
  'Record agent visit to Lowdown.',
  {
    agentId: z.string().describe('Agent identifier'),
    parcel: z.string().describe('Parcel coordinates e.g. "46,115"'),
    outcome: z.string().describe('Visit outcome e.g. "success"'),
  },
  async ({ agentId, parcel, outcome }) => {
    const result = await recordVisit({ agentId, parcel, outcome })
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
)

server.tool(
  'register_scene',
  'Register a Decentraland scene for AI agent discovery.',
  {
    parcel: z.string().describe('Parcel coordinates e.g. "46,115"'),
    name: z.string().describe('Scene name'),
    description: z.string().optional().describe('Scene description'),
    category: z.enum(['ai_service', 'art', 'game', 'shop', 'event', 'education', 'other']),
    services: z.string().optional().describe('Services offered, comma separated'),
    agentInstructions: z.string().optional().describe('Instructions for AI agents visiting this scene'),
    owner: z.string().optional().describe('Owner wallet or name'),
  },
  async (params) => {
    const result = await registerScene(params)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
)

server.tool(
  'explore',
  'Autonomously explore nearby parcels not yet visited, record to Lowdown.',
  {
    agentId: z.string().describe('Agent identifier'),
    baseParcel: z.string().describe('Base parcel to explore around e.g. "46,115"'),
    radius: z.number().optional().describe('Search radius in parcels, default 3'),
  },
  async ({ agentId, baseParcel, radius }) => {
    const result = await explore({ agentId, baseParcel, radius })
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
)

// ── Start ────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('[dcl-agent-mcp] v0.2.0 running on stdio')
}

main()
