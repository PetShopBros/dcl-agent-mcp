import axios from 'axios'
import type {
  RecordInteractionParams,
  RecordOutcomeParams,
  LowdownInteractionPayload,
  LowdownScene,
} from './types.js'

const DEFAULT_LOWDOWN_URL = 'https://lowdown-proxy.vercel.app'

export class LowdownClient {
  private baseUrl: string

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? process.env.LOWDOWN_URL ?? DEFAULT_LOWDOWN_URL
  }

  /**
   * Record a simple visit/interaction by parcel.
   */
  async recordInteraction(params: RecordInteractionParams): Promise<unknown> {
    const payload: LowdownInteractionPayload = {
      actor: params.agentId,
      target: `dcl:${params.parcel}`,
      target_type: 'service',
      task_type: params.action,
      outcome: params.outcome,
      source: 'organic',
    }
    return this._postInteraction(payload)
  }

  /**
   * Record a structured outcome from any agent action.
   */
  async recordOutcome(params: RecordOutcomeParams): Promise<unknown> {
    const payload: LowdownInteractionPayload = {
      actor: params.agentId,
      target: params.target,
      target_type: params.targetType ?? 'entity',
      task_type: params.action,
      outcome: params.outcome,
      result: params.result ? JSON.stringify(params.result) : null,
      source: 'organic',
    }
    return this._postInteraction(payload)
  }

  /**
   * Look up scene info from Lowdown registry by parcel or name.
   * Returns null if not registered or on error.
   */
  async getSceneInfo(parcelOrName: string): Promise<LowdownScene | null> {
    try {
      const isParcel = /^-?\d+,-?\d+$/.test(parcelOrName)
      const res = await axios.get(`${this.baseUrl}/api/scenes`, {
        params: isParcel ? { parcel: parcelOrName } : { name: parcelOrName },
      })
      const data = res.data
      if (Array.isArray(data)) return (data[0] as LowdownScene) ?? null
      return (data as LowdownScene) ?? null
    } catch (err: any) {
      if (err?.response?.status === 404) return null
      console.error('[Lowdown] getSceneInfo failed:', err?.message ?? err)
      return null
    }
  }

  /**
   * Get all registered scenes from Lowdown.
   */
  async getRegisteredScenes(): Promise<LowdownScene[]> {
    try {
      const res = await axios.get(`${this.baseUrl}/api/scenes`)
      return res.data?.data ?? []
    } catch {
      return []
    }
  }

  /**
   * Get list of parcels this agent has previously visited.
   */
  async getVisitedParcels(agentId: string): Promise<string[]> {
    try {
      const res = await axios.get(`${this.baseUrl}/api/interactions`, {
        params: { actor: agentId, task_type: 'discover', limit: 500 },
      })
      const targets = (res.data?.data ?? []).map((i: any) =>
        (i.target as string).replace('dcl:', '')
      )
      return [...new Set<string>(targets)]
    } catch {
      return []
    }
  }

  private async _postInteraction(payload: LowdownInteractionPayload): Promise<unknown> {
    try {
      const res = await axios.post(`${this.baseUrl}/api/interactions`, payload)
      return res.data
    } catch (err: any) {
      console.error('[Lowdown] record failed:', err?.response?.data ?? err?.message ?? err)
      return { error: err?.response?.data ?? err?.message }
    }
  }
}

// Singleton — tools import this directly
export const lowdownClient = new LowdownClient()

// Named exports for backwards compat with existing tools
export const recordInteraction = (p: RecordInteractionParams) => lowdownClient.recordInteraction(p)
export const recordOutcome = (p: RecordOutcomeParams) => lowdownClient.recordOutcome(p)
export const getSceneInfo = (p: string) => lowdownClient.getSceneInfo(p)
