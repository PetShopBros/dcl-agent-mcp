"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordInteraction = recordInteraction;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const LOWDOWN_URL = process.env.LOWDOWN_API_URL ?? '';
async function recordInteraction(params) {
    if (!LOWDOWN_URL)
        return null;
    try {
        const res = await axios_1.default.post(`${LOWDOWN_URL}/api/interactions`, {
            actor: params.agentId,
            target: `dcl:${params.parcel}`,
            target_type: 'service',
            task_type: params.action,
            outcome: params.outcome,
            source: 'organic'
        });
        return res.data;
    }
    catch (err) {
        console.error('[Lowdown] record failed:', err?.response?.data ?? err?.message ?? err);
        return { error: err?.response?.data ?? err?.message };
    }
}
