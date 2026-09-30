/**
 * IWorldAdapter — abstract interface for any virtual world.
 *
 * Implement this to connect a new world (Roblox, Spatial, etc.)
 * without changing MCP tool signatures.
 */

export interface Position {
  x: number
  y: number
  z: number
}

export interface WorldObject {
  id: string
  type: 'service' | 'portal' | 'npc' | 'item' | 'unknown'
  name: string
  action: 'interact' | 'enter' | 'use' | 'observe'
  description?: string
  metadata?: Record<string, unknown>
}

export interface WorldState {
  ok: boolean
  world: string
  wallet?: string | null
  position?: Position | null
  scene?: unknown
  objects?: WorldObject[]
  agentInstructions?: string | null
  timestamp: string
  error?: string
}

export interface InteractResult {
  ok: boolean
  world: string
  entityId: string
  outcome: 'success' | 'not_found' | 'error'
  result?: {
    service?: string
    description?: string
    nextAction?: string
    [key: string]: unknown
  }
  timestamp: string
}

export interface NavigateResult {
  ok: boolean
  world: string
  destination: string
  position?: Position | null
  timestamp: string
}

export interface IWorldAdapter {
  /** World identifier e.g. "decentraland", "roblox" */
  readonly worldId: string

  /** Enter world at a destination (parcel, scene name, coordinates) */
  connect(destination: string): Promise<{ ok: boolean; wallet?: string; position?: Position }>

  /** Observe current state with actionable objects */
  observe(): Promise<WorldState>

  /** Low-level move to world coordinates */
  move(x: number, y: number, z: number): Promise<{ ok: boolean; position?: Position }>

  /** High-level navigation by name/id */
  navigateTo(name: string): Promise<NavigateResult>

  /** Interact with a scene entity by id */
  interact(entityId: string): Promise<InteractResult>

  /** Disconnect from world */
  disconnect(): Promise<{ ok: boolean }>
}
