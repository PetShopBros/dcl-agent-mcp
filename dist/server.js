"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
const enterWorld_js_1 = require("./tools/enterWorld.js");
const observe_js_1 = require("./tools/observe.js");
const recordVisit_js_1 = require("./tools/recordVisit.js");
const explore_js_1 = require("./tools/explore.js");
const registerScene_js_1 = require("./tools/registerScene.js");
const PulseBridge_js_1 = require("./pulse/PulseBridge.js");
const api_js_1 = require("./dcl/api.js");
dotenv_1.default.config();
const server = new mcp_js_1.McpServer({
    name: 'dcl-agent-mcp',
    version: '0.2.0',
});
// ── Pulse presence tools ─────────────────────────────────────────────────────
server.tool('enter_world', 'Enter a Decentraland parcel with a real avatar presence via Pulse protocol. Returns wallet, position, and scene info.', { parcel: zod_1.z.string().describe('Parcel coordinates e.g. "46,115"') }, async ({ parcel }) => {
    const result = await (0, enterWorld_js_1.enterWorld)(parcel);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
});
server.tool('get_position', 'Get current avatar position in the DCL world.', {}, async () => {
    const result = await PulseBridge_js_1.pulseBridge.getPosition();
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
});
server.tool('move', 'Move the avatar to specific world coordinates. To compute from parcel: x = parcel_x * 16 + 8, z = parcel_z * 16 + 8.', {
    x: zod_1.z.number().describe('World X coordinate'),
    y: zod_1.z.number().default(0).describe('World Y coordinate (height, usually 0)'),
    z: zod_1.z.number().describe('World Z coordinate'),
}, async ({ x, y, z }) => {
    const result = await PulseBridge_js_1.pulseBridge.move(x, y, z);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
});
server.tool('observe_world', 'Observe the current avatar state (wallet, position) and scene info at current location.', {}, async () => {
    const pulse = await PulseBridge_js_1.pulseBridge.observe();
    let scene = null;
    if (pulse.ok && pulse.position) {
        // Convert world coords back to parcel for REST lookup
        const px = Math.floor(pulse.position.x / 16);
        const pz = Math.floor(pulse.position.z / 16);
        const info = await (0, api_js_1.getParcelInfo)(`${px},${pz}`);
        scene = info.scene;
    }
    return {
        content: [
            {
                type: 'text',
                text: JSON.stringify({ ...pulse, scene, timestamp: new Date().toISOString() }, null, 2),
            },
        ],
    };
});
server.tool('disconnect_world', 'Gracefully disconnect the avatar from Decentraland.', {}, async () => {
    const result = await PulseBridge_js_1.pulseBridge.disconnect();
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
});
// ── REST / Lowdown tools ─────────────────────────────────────────────────────
server.tool('observe', 'Observe a parcel\'s scene and tile info via REST (no Pulse presence required).', { parcel: zod_1.z.string().describe('Parcel coordinates e.g. "46,115"') }, async ({ parcel }) => {
    const result = await (0, observe_js_1.observe)(parcel);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
});
server.tool('record_visit', 'Record agent visit to Lowdown.', {
    agentId: zod_1.z.string().describe('Agent identifier'),
    parcel: zod_1.z.string().describe('Parcel coordinates e.g. "46,115"'),
    outcome: zod_1.z.string().describe('Visit outcome e.g. "success"'),
}, async ({ agentId, parcel, outcome }) => {
    const result = await (0, recordVisit_js_1.recordVisit)({ agentId, parcel, outcome });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
});
server.tool('register_scene', 'Register a Decentraland scene for AI agent discovery.', {
    parcel: zod_1.z.string().describe('Parcel coordinates e.g. "46,115"'),
    name: zod_1.z.string().describe('Scene name'),
    description: zod_1.z.string().optional().describe('Scene description'),
    category: zod_1.z.enum(['ai_service', 'art', 'game', 'shop', 'event', 'education', 'other']),
    services: zod_1.z.string().optional().describe('Services offered, comma separated'),
    agentInstructions: zod_1.z.string().optional().describe('Instructions for AI agents visiting this scene'),
    owner: zod_1.z.string().optional().describe('Owner wallet or name'),
}, async (params) => {
    const result = await (0, registerScene_js_1.registerScene)(params);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
});
server.tool('explore', 'Autonomously explore nearby parcels not yet visited, record to Lowdown.', {
    agentId: zod_1.z.string().describe('Agent identifier'),
    baseParcel: zod_1.z.string().describe('Base parcel to explore around e.g. "46,115"'),
    radius: zod_1.z.number().optional().describe('Search radius in parcels, default 3'),
}, async ({ agentId, baseParcel, radius }) => {
    const result = await (0, explore_js_1.explore)({ agentId, baseParcel, radius });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
});
// ── Start ────────────────────────────────────────────────────────────────────
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error('[dcl-agent-mcp] v0.2.0 running on stdio');
}
main();
