import dotenv from 'dotenv'
dotenv.config()

import { explore } from './tools/explore.js'

const AGENT_ID = process.env.AGENT_ID ?? 'dcl-autonomous-agent'
const BASE_PARCEL = process.env.DCL_SHOWROOM_PARCEL ?? '46,115'
const INTERVAL_MS = parseInt(process.env.EXPLORE_INTERVAL_MS ?? '3600000') // 기본 1시간

async function tick() {
  console.log(`[scheduler] ${new Date().toISOString()} — exploring...`)
  try {
    const result = await explore({
      agentId: AGENT_ID,
      baseParcel: BASE_PARCEL,
      radius: 5
    })
    console.log(`[scheduler] result:`, JSON.stringify(result, null, 2))
  } catch (err) {
    console.error(`[scheduler] error:`, err)
  }
}

console.log(`[scheduler] starting — agent: ${AGENT_ID}, base: ${BASE_PARCEL}, interval: ${INTERVAL_MS}ms`)

tick() // 시작 즉시 한 번 실행
setInterval(tick, INTERVAL_MS)