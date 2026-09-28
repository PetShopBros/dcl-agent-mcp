"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.observe = observe;
const api_js_1 = require("../dcl/api.js");
async function observe(parcel) {
    const info = await (0, api_js_1.getParcelInfo)(parcel);
    return {
        status: 'observed',
        parcel,
        scene: info.scene,
        tile: info.tile,
        timestamp: new Date().toISOString()
    };
}
