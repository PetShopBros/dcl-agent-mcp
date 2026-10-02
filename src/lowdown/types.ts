export type LowdownOutcome = 'success' | 'not_found' | 'error'

export type LowdownTargetType = 'entity' | 'scene' | 'parcel' | 'service'

export interface RecordInteractionParams {
  agentId: string
  parcel: string
  action: string
  outcome: string
}

export interface RecordOutcomeParams {
  agentId: string
  action: string
  target: string
  targetType?: LowdownTargetType
  outcome: LowdownOutcome
  result?: Record<string, unknown>
}

export interface LowdownInteractionPayload {
  actor: string
  target: string
  target_type: string
  task_type: string
  outcome: string
  result?: string | null
  source: string
}

// Matches API response shape
export interface LowdownScene {
  id: string
  parcel: string
  name: string
  description?: string
  category?: string
  services?: string          // comma-separated string from API
  agentInstructions?: string
  owner?: string
}
