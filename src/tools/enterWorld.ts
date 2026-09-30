import { getParcelInfo } from '../dcl/api.js'
import { pulseBridge } from '../pulse/PulseBridge.js'

export async function enterWorld(parcel: string) {
  // 1. Real Pulse presence in DCL (agentic body)
  const pulse = await pulseBridge.connect(parcel)

  // 2. Scene metadata via REST
  const info = await getParcelInfo(parcel)

  return {
    status: pulse.ok ? 'entered' : 'rest_only',
    parcel,
    wallet: pulse.wallet ?? null,
    position: pulse.position ?? null,
    scene: info.scene,
    timestamp: new Date().toISOString(),
  }
}
