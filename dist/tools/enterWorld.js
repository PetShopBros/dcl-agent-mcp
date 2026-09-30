"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enterWorld = enterWorld;
const api_js_1 = require("../dcl/api.js");
const PulseBridge_js_1 = require("../pulse/PulseBridge.js");
async function enterWorld(parcel) {
    // 1. Real Pulse presence in DCL (agentic body)
    const pulse = await PulseBridge_js_1.pulseBridge.connect(parcel);
    // 2. Scene metadata via REST
    const info = await (0, api_js_1.getParcelInfo)(parcel);
    return {
        status: pulse.ok ? 'entered' : 'rest_only',
        parcel,
        wallet: pulse.wallet ?? null,
        position: pulse.position ?? null,
        scene: info.scene,
        timestamp: new Date().toISOString(),
    };
}
