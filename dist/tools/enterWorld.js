"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enterWorld = enterWorld;
const api_js_1 = require("../dcl/api.js");
async function enterWorld(parcel) {
    const [info, teleported] = await Promise.all([
        (0, api_js_1.getParcelInfo)(parcel),
        (0, api_js_1.teleportTo)(parcel)
    ]);
    return {
        status: 'entered',
        parcel,
        teleported,
        scene: info.scene,
        tile: info.tile,
        timestamp: new Date().toISOString()
    };
}
