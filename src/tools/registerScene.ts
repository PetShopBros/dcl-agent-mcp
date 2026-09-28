import axios from 'axios'

const LOWDOWN_URL = process.env.LOWDOWN_API_URL!

export async function registerScene(params: {
  parcel: string
  name: string
  description?: string
  category: string
  services?: string
  agentInstructions?: string
  owner?: string
}) {
  const res = await axios.post(`${LOWDOWN_URL}/api/scenes`, {
    parcel: params.parcel,
    name: params.name,
    description: params.description ?? null,
    category: params.category,
    services: params.services ?? null,
    agent_instructions: params.agentInstructions ?? null,
    owner: params.owner ?? null
  })
  return res.data
}