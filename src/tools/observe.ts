import { getParcelInfo } from '../dcl/api.js'

export async function observe(parcel: string) {
  const info = await getParcelInfo(parcel)
  return {
    status: 'observed',
    parcel,
    scene: info.scene,
    tile: info.tile,
    timestamp: new Date().toISOString()
  }
}