import axios from 'axios'
import dotenv from 'dotenv'
dotenv.config()

const LOWDOWN_URL = process.env.LOWDOWN_API_URL ?? ''

export async function recordInteraction(params: {
  agentId: string
  parcel: string
  action: string
  outcome: string
}) {
  if (!LOWDOWN_URL) return null

  try {
    const res = await axios.post(`${LOWDOWN_URL}/api/interactions`, {
      actor: params.agentId,
      target: `dcl:${params.parcel}`,
      target_type: 'service',
      task_type: params.action,
      outcome: params.outcome,
      source: 'organic'
    })
    return res.data
  } catch (err: any) {
    console.error('[Lowdown] record failed:', err?.response?.data ?? err?.message ?? err)
    return { error: err?.response?.data ?? err?.message }
  }
}