"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.interact = interact;
const DCLAdapter_js_1 = require("../adapters/DCLAdapter.js");
const client_js_1 = require("../lowdown/client.js");
async function interact(params) {
    const result = await DCLAdapter_js_1.dclAdapter.interact(params.entityId);
    // Persist to Lowdown if agentId provided
    if (params.agentId) {
        await (0, client_js_1.recordOutcome)({
            agentId: params.agentId,
            action: 'interact',
            target: params.entityId,
            targetType: 'entity',
            outcome: result.outcome,
            result: result.result,
        });
    }
    return result;
}
