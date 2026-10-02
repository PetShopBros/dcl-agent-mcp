"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dclAdapter = exports.DCLAdapter = void 0;
const PulseBridge_js_1 = require("../pulse/PulseBridge.js");
const api_js_1 = require("../dcl/api.js");
const client_js_1 = require("../lowdown/client.js");
function str(v) {
    return typeof v === 'string' ? v : undefined;
}
const AGENT_ID = () => process.env.AGENT_ID ?? 'Remy';
class DCLAdapter {
    constructor() {
        this.worldId = 'decentraland';
    }
    async connect(parcel) { return PulseBridge_js_1.pulseBridge.connect(parcel); }
    async observe() {
        const pulse = await PulseBridge_js_1.pulseBridge.observe();
        let scene = null, objects = [], agentInstructions = null;
        if (pulse.ok && pulse.position) {
            const px = Math.floor(pulse.position.x / 16);
            const pz = Math.floor(pulse.position.z / 16);
            const parcel = `${px},${pz}`;
            const [dclInfo, lowdownScene] = await Promise.all([(0, api_js_1.getParcelInfo)(parcel), (0, client_js_1.getSceneInfo)(parcel)]);
            scene = dclInfo.scene;
            if (lowdownScene) {
                agentInstructions = lowdownScene.agentInstructions ?? null;
                if (lowdownScene.services) {
                    const sceneName = lowdownScene.name ?? parcel;
                    objects = lowdownScene.services.split(',').map(s => s.trim()).filter(Boolean).map((svc) => ({
                        id: svc.toLowerCase().replace(/\s+/g, '-'), type: 'service', name: svc, action: 'interact',
                        description: `Service available in ${sceneName}`
                    }));
                }
                if (lowdownScene.category === 'portal' || lowdownScene.category === 'ai_service') {
                    objects.unshift({ id: `scene-${parcel}`, type: 'portal', name: str(lowdownScene.name) ?? parcel, action: 'enter', description: str(lowdownScene.description) });
                }
            }
        }
        return { ok: pulse.ok, world: this.worldId, wallet: pulse.wallet ?? null, position: pulse.position ?? null, scene, objects, agentInstructions, timestamp: new Date().toISOString(), error: pulse.error };
    }
    async move(x, y, z) {
        const agentId = AGENT_ID();
        // 이동 전 position 캡처
        const beforeObs = await PulseBridge_js_1.pulseBridge.observe();
        const fromPos = beforeObs.position ?? null;
        // 이동
        const r = await PulseBridge_js_1.pulseBridge.move(x, y, z);
        const toPos = r.position ?? null;
        // blocked 감지: position delta < 0.5 이면 막힌 것
        let status = 'failed';
        if (r.ok) {
            if (fromPos && toPos) {
                const delta = Math.abs(toPos.x - fromPos.x) + Math.abs(toPos.z - fromPos.z);
                status = delta < 0.5 ? 'blocked' : 'success';
            }
            else {
                status = 'success';
            }
        }
        // Lowdown 자동 기록
        await client_js_1.lowdownClient.recordOutcome({
            agentId,
            target: 'dcl:world',
            targetType: 'service',
            action: 'move',
            outcome: status === 'success' ? 'success' : 'error',
            result: {
                agent: agentId,
                action: 'move',
                from: fromPos,
                to: toPos ?? { x, y, z },
                outcome: status,
            },
        });
        return { ok: r.ok, status, position: toPos ?? undefined };
    }
    async navigateTo(name) {
        const scene = await (0, client_js_1.getSceneInfo)(name);
        if (!scene?.parcel)
            return { ok: false, world: this.worldId, destination: name, timestamp: new Date().toISOString() };
        const [px, pz] = scene.parcel.split(',').map(Number);
        const wx = px * 16 + 8, wz = pz * 16 + 8;
        const r = await this.move(wx, 0, wz);
        return { ok: r.ok, world: this.worldId, destination: name, position: r.position ?? { x: wx, y: 0, z: wz }, timestamp: new Date().toISOString() };
    }
    async interact(entityId) {
        const scene = await (0, client_js_1.getSceneInfo)(entityId);
        if (!scene)
            return { ok: false, world: this.worldId, entityId, outcome: 'not_found', timestamp: new Date().toISOString() };
        if (scene.parcel) {
            const [px, pz] = scene.parcel.split(',').map(Number);
            await this.move(px * 16 + 8, 0, pz * 16 + 8);
        }
        return { ok: true, world: this.worldId, entityId, outcome: 'success', result: { service: scene.name, description: scene.description, agentInstructions: scene.agentInstructions, nextAction: scene.agentInstructions ? 'follow_instructions' : 'observe' }, timestamp: new Date().toISOString() };
    }
    async disconnect() { const r = await PulseBridge_js_1.pulseBridge.disconnect(); return { ok: r.ok }; }
}
exports.DCLAdapter = DCLAdapter;
exports.dclAdapter = new DCLAdapter();
