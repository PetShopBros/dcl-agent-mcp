import { dclAdapter } from '../adapters/DCLAdapter.js'
import { recordOutcome } from '../lowdown/client.js'

export async function navigateTo(params: {
  destination: string
  agentId?: string
}) {
  const result = await dclAdapter.navigateTo(params.destination)

  if (params.agentId) {
    await recordOutcome({
      agentId: params.agentId,
      action: 'navigate',
      target: params.destination,
      targetType: 'scene',
      outcome: result.ok ? 'success' : 'error',
      result: { position: result.position },
    })
  }

  return result
}
