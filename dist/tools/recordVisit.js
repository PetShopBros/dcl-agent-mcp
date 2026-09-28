"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordVisit = recordVisit;
const client_js_1 = require("../lowdown/client.js");
async function recordVisit(params) {
    const result = await (0, client_js_1.recordInteraction)({
        agentId: params.agentId,
        parcel: params.parcel,
        action: 'visit',
        outcome: params.outcome
    });
    return {
        status: 'recorded',
        lowdown: result
    };
}
