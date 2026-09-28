import axios from 'axios'

import dotenv from 'dotenv'
dotenv.config()

const CATALYST_URL = 'https://peer-lb.decentraland.org'
const EXPLORER_MCP_URL = process.env.EXPLORER_MCP_URL ?? 'http://127.0.0.1:8123'

let mcpSessionId: string | null = null

async function getExplorerSession(): Promise<string | null> {
  try {
    const res = await axios.post(
      `${EXPLORER_MCP_URL}/unity-explorer-mcp`,
      { jsonrpc: '2.0', method: 'initialize', id: 1, params: {} },
      { headers: { 'Content-Type': 'application/json' } }
    )
    return res.headers['mcp-session-id'] ?? null
  } catch {
    return null
  }
}

export async function teleportTo(parcel: string): Promise<boolean> {
  try {
    if (!mcpSessionId) mcpSessionId = await getExplorerSession()
    if (!mcpSessionId) return false

    const [x, y] = parcel.split(',').map(Number)
    await axios.post(
      `${EXPLORER_MCP_URL}/unity-explorer-mcp`,
      {
        jsonrpc: '2.0',
        method: 'tools/call',
        id: 2,
        params: {
          name: 'send_chat',
          arguments: { message: `/goto ${x},${y}` }
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Mcp-Session-Id': mcpSessionId
        }
      }
    )
    return true
  } catch {
    return false
  }
}

export async function getParcelInfo(parcel: string) {
  const [x, y] = parcel.split(',').map(Number)

  const places = await axios.get(`https://places.decentraland.org/api/places?positions=${x},${y}`)

  return {
    parcel,
    scene: places.data?.data?.[0] ?? null,
    tile: null
  }
}