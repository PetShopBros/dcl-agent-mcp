"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordInteraction = recordInteraction;
exports.recordOutcome = recordOutcome;
exports.getSceneInfo = getSceneInfo;
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
/**
 * Record a structured outcome from an agent action.
 * Used by interact / navigate_to to persist evidence.
 */
async function recordOutcome(params) {
    if (!LOWDOWN_URL)
        return null;
    try {
        const res = await axios_1.default.post(`${LOWDOWN_URL}/api/interactions`, {
            actor: params.agentId,
            target: params.target,
            target_type: params.targetType ?? 'entity',
            task_type: params.action,
            outcome: params.outcome,
            result: params.result ? JSON.stringify(params.result) : null,
            source: 'organic'
        });
        return res.data;
    }
    catch (err) {
        console.error('[Lowdown] recordOutcome failed:', err?.response?.data ?? err?.message ?? err);
        return { error: err?.response?.data ?? err?.message };
    }
}
/**
 * Get scene info from Lowdown registry by parcel or name.
 * Returns null if not found or LOWDOWN_URL not set.
 */
async function getSceneInfo(parcelOrName) {
    if (!LOWDOWN_URL)
        return null;
    try {
        // Try parcel lookup first (e.g. "46,115")
        if (/^-?\d+,-?\d+$/.test(parcelOrName)) {
            const res = await axios_1.default.get(`${LOWDOWN_URL}/api/scenes`, {
                params: { parcel: parcelOrName }
            });
            const data = res.data;
            // Accept array or single object
            if (Array.isArray(data))
                return data[0] ?? null;
            return data ?? null;
        }
        // Otherwise search by name / id
        const res = await axios_1.default.get(`${LOWDOWN_URL}/api/scenes`, {
            params: { name: parcelOrName }
        });
        const data = res.data;
        if (Array.isArray(data))
            return data[0] ?? null;
        return data ?? null;
    }
    catch (err) {
        // 404 = not registered, that's fine
        if (err?.response?.status === 404)
            return null;
        console.error('[Lowdown] getSceneInfo failed:', err?.message ?? err);
        return null;
    }
}
