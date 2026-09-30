import { pulseBridge } from '../pulse/PulseBridge.js'
import { getParcelInfo } from '../dcl/api.js'
import { getSceneInfo } from '../lowdown/client.js'
import type { IWorldAdapter, WorldState, WorldObject, InteractResult, NavigateResult } from './IWorldAdapter.js'

function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined
}

export class DCLAdapter implements IWorldAdapter {
  readonly worldId = 'decentraland'

  async connect(parcel: string) { return pulseBridge.connect(parcel) }

  async observe(): Promise<WorldState> {
    const pulse = await pulseBridge.observe()
    let scene = null, objects: WorldObject[] = [], agentInstructions: string | null = null

    if (pulse.ok && pulse.position) {
      const px = Math.floor(pulse.position.x / 16)
      const pz = Math.floor(pulse.position.z / 16)
      const parcel = `${px},${pz}`
      const [dclInfo, lowdownScene] = await Promise.all([getParcelInfo(parcel), getSceneInfo(parcel)])
      scene = dclInfo.scene
      if (lowdownScene) {
        agentInstructions = str(lowdownScene.agent_instructions) ?? null
        if (lowdownScene.services) {
          const sceneName = str(lowdownScene.name) ?? parcel
          objects = (lowdownScene.services as string).split(',').map(s => s.trim()).filter(Boolean).map((svc): WorldObject => ({
            id: svc.toLowerCase().replace(/\s+/g, '-'), type: 'service', name: svc, action: 'interact',
            description: `Service available in ${sceneName}`
          }))
        }
        if (lowdownScene.category === 'portal' || lowdownScene.category === 'ai_service') {
          objects.unshift({ id: `scene-${parcel}`, type: 'portal', name: str(lowdownScene.name) ?? parcel, action: 'enter', description: str(lowdownScene.description) })
        }
      }
    }
    return { ok: pulse.ok, world: this.worldId, wallet: pulse.wallet ?? null, position: pulse.position ?? null, scene, objects, agentInstructions, timestamp: new Date().toISOString(), error: pulse.error }
  }

  async move(x: number, y: number, z: number) {
    const r = await pulseBridge.move(x, y, z)
    return { ok: r.ok, position: r.position }
  }

  async navigateTo(name: string): Promise<NavigateResult> {
    const scene = await getSceneInfo(name)
    if (!scene?.parcel) return { ok: false, world: this.worldId, destination: name, timestamp: new Date().toISOString() }
    const [px, pz] = (scene.parcel as string).split(',').map(Number)
    const wx = px * 16 + 8, wz = pz * 16 + 8
    const r = await pulseBridge.move(wx, 0, wz)
    return { ok: r.ok, world: this.worldId, destination: name, position: r.position ?? { x: wx, y: 0, z: wz }, timestamp: new Date().toISOString() }
  }

  async interact(entityId: string): Promise<InteractResult> {
    const scene = await getSceneInfo(entityId)
    if (!scene) return { ok: false, world: this.worldId, entityId, outcome: 'not_found', timestamp: new Date().toISOString() }
    if (scene.parcel) {
      const [px, pz] = (scene.parcel as string).split(',').map(Number)
      await pulseBridge.move(px * 16 + 8, 0, pz * 16 + 8)
    }
    return { ok: true, world: this.worldId, entityId, outcome: 'success', result: { service: str(scene.name), description: str(scene.description), agentInstructions: str(scene.agent_instructions), nextAction: scene.agent_instructions ? 'follow_instructions' : 'observe' }, timestamp: new Date().toISOString() }
  }

  async disconnect() { const r = await pulseBridge.disconnect(); return { ok: r.ok } }
}

export const dclAdapter = new DCLAdapter()
