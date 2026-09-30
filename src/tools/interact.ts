import { dclAdapter } from '../adapters/DCLAdapter.js'
import { recordOutcome } from '../lowdown/client.js'

export async function interact(params: {
  entityId: string
  agentId?: string
}) {
  const result = await dclAdapter.interact(params.entityId)

  // Persist to Lowdown if agentId provided
  if (params.agentId) {
    await recordOutcome({
      agentId: params.agentId,
      action: 'interact',
      target: params.entityId,
      targetType: 'entity',
      outcome: result.outcome,
      result: result.result,
    })
  }

  return result
}
