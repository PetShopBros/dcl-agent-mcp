"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSceneInfo = exports.recordOutcome = exports.recordInteraction = exports.lowdownClient = exports.LowdownClient = void 0;
const axios_1 = __importDefault(require("axios"));
const DEFAULT_LOWDOWN_URL = 'https://lowdown-proxy.vercel.app';
class LowdownClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl ?? process.env.LOWDOWN_URL ?? DEFAULT_LOWDOWN_URL;
    }
    /**
     * Record a simple visit/interaction by parcel.
     */
    async recordInteraction(params) {
        const payload = {
            actor: params.agentId,
            target: `dcl:${params.parcel}`,
            target_type: 'service',
            task_type: params.action,
            outcome: params.outcome,
            source: 'organic',
        };
        return this._postInteraction(payload);
    }
    /**
     * Record a structured outcome from any agent action.
     */
    async recordOutcome(params) {
        const payload = {
            actor: params.agentId,
            target: params.target,
            target_type: params.targetType ?? 'entity',
            task_type: params.action,
            outcome: params.outcome,
            result: params.result ? JSON.stringify(params.result) : null,
            source: 'organic',
        };
        return this._postInteraction(payload);
    }
    /**
     * Look up scene info from Lowdown registry by parcel or name.
     * Returns null if not registered or on error.
     */
    async getSceneInfo(parcelOrName) {
        try {
            const isParcel = /^-?\d+,-?\d+$/.test(parcelOrName);
            const res = await axios_1.default.get(`${this.baseUrl}/api/scenes`, {
                params: isParcel ? { parcel: parcelOrName } : { name: parcelOrName },
            });
            const data = res.data;
            if (Array.isArray(data))
                return data[0] ?? null;
            return data ?? null;
        }
        catch (err) {
            if (err?.response?.status === 404)
                return null;
            console.error('[Lowdown] getSceneInfo failed:', err?.message ?? err);
            return null;
        }
    }
    /**
     * Get all registered scenes from Lowdown.
     */
    async getRegisteredScenes() {
        try {
            const res = await axios_1.default.get(`${this.baseUrl}/api/scenes`);
            return res.data?.data ?? [];
        }
        catch {
            return [];
        }
    }
    /**
     * Get list of parcels this agent has previously visited.
     */
    async getVisitedParcels(agentId) {
        try {
            const res = await axios_1.default.get(`${this.baseUrl}/api/interactions`, {
                params: { actor: agentId, task_type: 'discover', limit: 500 },
            });
            const targets = (res.data?.data ?? []).map((i) => i.target.replace('dcl:', ''));
            return [...new Set(targets)];
        }
        catch {
            return [];
        }
    }
    async _postInteraction(payload) {
        try {
            const res = await axios_1.default.post(`${this.baseUrl}/api/interactions`, payload);
            return res.data;
        }
        catch (err) {
            console.error('[Lowdown] record failed:', err?.response?.data ?? err?.message ?? err);
            return { error: err?.response?.data ?? err?.message };
        }
    }
}
exports.LowdownClient = LowdownClient;
// Singleton — tools import this directly
exports.lowdownClient = new LowdownClient();
// Named exports for backwards compat with existing tools
const recordInteraction = (p) => exports.lowdownClient.recordInteraction(p);
exports.recordInteraction = recordInteraction;
const recordOutcome = (p) => exports.lowdownClient.recordOutcome(p);
exports.recordOutcome = recordOutcome;
const getSceneInfo = (p) => exports.lowdownClient.getSceneInfo(p);
exports.getSceneInfo = getSceneInfo;
