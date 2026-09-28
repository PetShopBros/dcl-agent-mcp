import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import dotenv from 'dotenv'
import { enterWorld } from './tools/enterWorld.js'
import { observe } from './tools/observe.js'
import { recordVisit } from './tools/recordVisit.js'

dotenv.config()

const server = new McpServer({
  name: 'dcl-agent-mcp',
  version: '0.1.0'
})

server.tool(
  'enter_world',
  'Enter a Decentraland parcel and get scene info',
  { parcel: z.string().describe('Parcel coordinates e.g. "46,115"') },
  async ({ parcel }) => {
    const result = await enterWorld(parcel)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
)

server.tool(
  'observe',
  'Observe current parcel scene and tile info',
  { parcel: z.string().describe('Parcel coordinates e.g. "46,115"') },
  async ({ parcel }) => {
    const result = await observe(parcel)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
)

server.tool(
  'record_visit',
  'Record agent visit to Lowdown',
  {
    agentId: z.string().describe('Agent identifier'),
    parcel: z.string().describe('Parcel coordinates e.g. "46,115"'),
    outcome: z.string().describe('Visit outcome e.g. "success"')
  },
  async ({ agentId, parcel, outcome }) => {
    const result = await recordVisit({ agentId, parcel, outcome })
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('[dcl-agent-mcp] running on stdio')
}

main()