import { getParcelInfo, teleportTo } from '../dcl/api.js'

export async function enterWorld(parcel: string) {
  const [info, teleported] = await Promise.all([
    getParcelInfo(parcel),
    teleportTo(parcel)
  ])
  return {
    status: 'entered',
    parcel,
    teleported,
    scene: info.scene,
    tile: info.tile,
    timestamp: new Date().toISOString()
  }
}