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

/**
 * Record a structured outcome from an agent action.
 * Used by interact / navigate_to to persist evidence.
 */
export async function recordOutcome(params: {
  agentId: string
  action: string
  target: string
  targetType?: string
  outcome: 'success' | 'not_found' | 'error'
  result?: Record<string, unknown>
}) {
  if (!LOWDOWN_URL) return null

  try {
    const res = await axios.post(`${LOWDOWN_URL}/api/interactions`, {
      actor: params.agentId,
      target: params.target,
      target_type: params.targetType ?? 'entity',
      task_type: params.action,
      outcome: params.outcome,
      result: params.result ? JSON.stringify(params.result) : null,
      source: 'organic'
    })
    return res.data
  } catch (err: any) {
    console.error('[Lowdown] recordOutcome failed:', err?.response?.data ?? err?.message ?? err)
    return { error: err?.response?.data ?? err?.message }
  }
}

/**
 * Get scene info from Lowdown registry by parcel or name.
 * Returns null if not found or LOWDOWN_URL not set.
 */
export async function getSceneInfo(parcelOrName: string): Promise<any> {
  if (!LOWDOWN_URL) return null

  try {
    // Try parcel lookup first (e.g. "46,115")
    if (/^-?\d+,-?\d+$/.test(parcelOrName)) {
      const res = await axios.get(`${LOWDOWN_URL}/api/scenes`, {
        params: { parcel: parcelOrName }
      })
      const data = res.data
      // Accept array or single object
      if (Array.isArray(data)) return data[0] ?? null
      return data ?? null
    }

    // Otherwise search by name / id
    const res = await axios.get(`${LOWDOWN_URL}/api/scenes`, {
      params: { name: parcelOrName }
    })
    const data = res.data
    if (Array.isArray(data)) return data[0] ?? null
    return data ?? null
  } catch (err: any) {
    // 404 = not registered, that's fine
    if (err?.response?.status === 404) return null
    console.error('[Lowdown] getSceneInfo failed:', err?.message ?? err)
    return null
  }
}
