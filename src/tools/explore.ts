import { getParcelInfo } from '../dcl/api.js'
import { recordInteraction } from '../lowdown/client.js'
import axios from 'axios'

const LOWDOWN_URL = process.env.LOWDOWN_API_URL!

async function getVisitedParcels(agentId: string): Promise<string[]> {
  try {
    const res = await axios.get(`${LOWDOWN_URL}/api/interactions`, {
      params: { actor: agentId, task_type: 'discover', limit: 500 }
    })
    const targets = (res.data?.data ?? []).map((i: any) => i.target.replace('dcl:', ''))
    return [...new Set<string>(targets)]
  } catch {
    return []
  }
}

function getActivityScore(scene: any): 'dead' | 'low' | 'medium' | 'active' {
  if (!scene) return 'dead'
  const visits = scene.user_visits ?? 0
  const userCount = scene.user_count ?? 0
  const deployedAt = scene.deployed_at ? new Date(scene.deployed_at) : null
  const daysSinceDeployed = deployedAt
    ? (Date.now() - deployedAt.getTime()) / (1000 * 60 * 60 * 24)
    : 9999
  if (userCount > 0) return 'active'
  if (visits > 100) return 'medium'
  if (visits > 10 || daysSinceDeployed < 90) return 'low'
  return 'dead'
}

function classifyScene(scene: any): string {
  const text = `${scene.title ?? ''} ${scene.description ?? ''}`.toLowerCase()
  if (text.match(/ai|agent|gpt|llm|machine learning|ml/)) return 'ai_service'
  if (text.match(/art|gallery|museum|exhibit/)) return 'art'
  if (text.match(/game|play|quest|arena|battle/)) return 'game'
  if (text.match(/shop|store|market|buy|sell|nft/)) return 'shop'
  if (text.match(/event|concert|show|party/)) return 'event'
  if (text.match(/education|learn|school|course/)) return 'education'
  return 'other'
}

function evaluateRelevance(category: string, activityScore: string): 'high' | 'medium' | 'low' {
  if (category === 'ai_service') return 'high'
  if (activityScore === 'active') return 'medium'
  if (category === 'shop' || category === 'event') return 'medium'
  return 'low'
}

interface RegisteredScene {
  parcel: string
  name: string
  category: string
  agent_instructions?: string
}

async function getRegisteredScenes(): Promise<RegisteredScene[]> {
  try {
    const res = await axios.get(`${LOWDOWN_URL}/api/scenes`)
    return res.data?.data ?? []
  } catch {
    return []
  }
}

function getNearbyParcels(base: string, radius: number = 5): string[] {
  const [bx, by] = base.split(',').map(Number)
  const parcels: string[] = []
  for (let x = bx - radius; x <= bx + radius; x++) {
    for (let y = by - radius; y <= by + radius; y++) {
      if (x === bx && y === by) continue
      parcels.push(`${x},${y}`)
    }
  }
  return parcels
}

export async function explore(params: {
  agentId: string
  baseParcel: string
  radius?: number
}) {
  const { agentId, baseParcel, radius = 5 } = params

  const visited = await getVisitedParcels(agentId)
  const nearby = getNearbyParcels(baseParcel, radius)
  const unvisited = nearby.filter(p => !visited.includes(p))

  if (unvisited.length === 0) {
    return { status: 'all_visited', visited: visited.length }
  }

  const registeredScenes = await getRegisteredScenes()
  const registeredParcels = registeredScenes.map(s => s.parcel)
  const allToCheck = visited.includes(baseParcel) ? unvisited : [baseParcel, ...unvisited]
  const registeredUnvisited = allToCheck.filter(p => registeredParcels.includes(p))
  const prioritized = [...registeredUnvisited, ...allToCheck.filter(p => !registeredParcels.includes(p))]

  for (const parcel of prioritized) {
    const info = await getParcelInfo(parcel)
    const registeredScene = registeredScenes.find(s => s.parcel === parcel)

    if (!info.scene && !registeredScene) continue

    const activityScore = getActivityScore(info.scene)
    const isRegistered = !!registeredScene

    if (activityScore === 'dead' && !isRegistered) {
      await recordInteraction({ agentId, parcel, action: 'skip', outcome: 'success' })
      continue
    }

    const category = registeredScene?.category ?? classifyScene(info.scene)
    const sceneName = registeredScene?.name ?? info.scene?.title ?? parcel
    const relevance = evaluateRelevance(category, activityScore)

    await recordInteraction({ agentId, parcel, action: 'discover', outcome: 'success' })
    await recordInteraction({ agentId, parcel, action: `classify:${category}`, outcome: 'success' })
    await recordInteraction({ agentId, parcel, action: `evaluate:${relevance}`, outcome: 'success' })

    if (relevance === 'high') {
      await recordInteraction({ agentId, parcel, action: 'recommend', outcome: 'success' })
    }

    return {
      status: 'discovered',
      target: parcel,
      scene: sceneName,
      activity_score: activityScore,
      category,
      relevance,
      agent_instructions: registeredScene?.agent_instructions ?? null,
      visited_before: visited.length,
      timestamp: new Date().toISOString()
    }
  }

  return {
    status: 'no_active_scene',
    scanned: unvisited.length,
    visited_before: visited.length
  }
}