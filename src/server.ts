import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import dotenv from 'dotenv'
import { enterWorld } from './tools/enterWorld.js'
import { observe } from './tools/observe.js'
import { recordVisit } from './tools/recordVisit.js'
import { explore } from './tools/explore.js'
import { registerScene } from './tools/registerScene.js'
import { interact } from './tools/interact.js'
import { navigateTo } from './tools/navigateTo.js'
import { pulseBridge } from './pulse/PulseBridge.js'
import { dclAdapter } from './adapters/DCLAdapter.js'
import { recordOutcome } from './lowdown/client.js'

dotenv.config()

const server = new McpServer({
  name: 'dcl-agent-mcp',
  version: '0.3.0',
})

// ?? Pulse presence tools ?????????????????????????????????????????????????????

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
    const result = await dclAdapter.move(x, y, z)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
)

server.tool(
  'observe_world',
  'Observe current avatar state + scene info with actionable objects. Returns wallet, position, scene metadata, and list of entities the agent can interact with.',
  {},
  async () => {
    const result = await dclAdapter.observe()
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
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

// ?? Action tools ?????????????????????????????????????????????????????????????

server.tool(
  'interact',
  'Interact with a scene entity by id. Navigates to entity, retrieves service info, and records outcome to Lowdown.',
  {
    entityId: z.string().describe('Entity id from observe_world objects list e.g. "lowdown-demo"'),
    agentId: z.string().optional().describe('Agent identifier for Lowdown recording'),
  },
  async ({ entityId, agentId }) => {
    const result = await interact({ entityId, agentId })
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
)

server.tool(
  'navigate_to',
  'Navigate avatar to a named destination (scene name or id). Looks up parcel from registry and moves.',
  {
    destination: z.string().describe('Scene name or id e.g. "Agent Gateway" or "lowdown-demo"'),
    agentId: z.string().optional().describe('Agent identifier for Lowdown recording'),
  },
  async ({ destination, agentId }) => {
    const result = await navigateTo({ destination, agentId })
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
)

server.tool(
  'record_outcome',
  'Record a structured action outcome to Lowdown. Use after any significant agent action.',
  {
    agentId: z.string().describe('Agent identifier'),
    action: z.string().describe('Action performed e.g. "interact", "navigate", "observe"'),
    target: z.string().describe('Target entity or parcel'),
    targetType: z.enum(['entity', 'scene', 'parcel', 'service']).optional().default('entity'),
    outcome: z.enum(['success', 'not_found', 'error']).describe('Action result'),
    result: z.string().optional().describe('JSON string with additional result data'),
  },
  async ({ agentId, action, target, targetType, outcome, result }) => {
    const parsed = result ? JSON.parse(result) : undefined
    const recorded = await recordOutcome({ agentId, action, target, targetType, outcome, result: parsed })
    return { content: [{ type: 'text', text: JSON.stringify(recorded, null, 2) }] }
  }
)

// ?? REST / Lowdown tools ?????????????????????????????????????????????????????

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

// ?? Start ????????????????????????????????????????????????????????????????????

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('[dcl-agent-mcp] v0.3.0 running on stdio')
}

main()

