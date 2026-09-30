"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.navigateTo = navigateTo;
const DCLAdapter_js_1 = require("../adapters/DCLAdapter.js");
const client_js_1 = require("../lowdown/client.js");
async function navigateTo(params) {
    const result = await DCLAdapter_js_1.dclAdapter.navigateTo(params.destination);
    if (params.agentId) {
        await (0, client_js_1.recordOutcome)({
            agentId: params.agentId,
            action: 'navigate',
            target: params.destination,
            targetType: 'scene',
            outcome: result.ok ? 'success' : 'error',
            result: { position: result.position },
        });
    }
    return result;
}
