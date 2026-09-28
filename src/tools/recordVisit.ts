import { recordInteraction } from '../lowdown/client.js'

export async function recordVisit(params: {
  agentId: string
  parcel: string
  outcome: string
}) {
  const result = await recordInteraction({
    agentId: params.agentId,
    parcel: params.parcel,
    action: 'visit',
    outcome: params.outcome
  })
  return {
    status: 'recorded',
    lowdown: result
  }
}