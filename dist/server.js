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
const interact_js_1 = require("./tools/interact.js");
const navigateTo_js_1 = require("./tools/navigateTo.js");
const PulseBridge_js_1 = require("./pulse/PulseBridge.js");
const DCLAdapter_js_1 = require("./adapters/DCLAdapter.js");
const client_js_1 = require("./lowdown/client.js");
dotenv_1.default.config();
const server = new mcp_js_1.McpServer({
    name: 'dcl-agent-mcp',
    version: '0.3.0',
});
// ?? Pulse presence tools ?????????????????????????????????????????????????????
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
    const result = await DCLAdapter_js_1.dclAdapter.move(x, y, z);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
});
server.tool('observe_world', 'Observe current avatar state + scene info with actionable objects. Returns wallet, position, scene metadata, and list of entities the agent can interact with.', {}, async () => {
    const result = await DCLAdapter_js_1.dclAdapter.observe();
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
});
server.tool('disconnect_world', 'Gracefully disconnect the avatar from Decentraland.', {}, async () => {
    const result = await PulseBridge_js_1.pulseBridge.disconnect();
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
});
// ?? Action tools ?????????????????????????????????????????????????????????????
server.tool('interact', 'Interact with a scene entity by id. Navigates to entity, retrieves service info, and records outcome to Lowdown.', {
    entityId: zod_1.z.string().describe('Entity id from observe_world objects list e.g. "lowdown-demo"'),
    agentId: zod_1.z.string().optional().describe('Agent identifier for Lowdown recording'),
}, async ({ entityId, agentId }) => {
    const result = await (0, interact_js_1.interact)({ entityId, agentId });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
});
server.tool('navigate_to', 'Navigate avatar to a named destination (scene name or id). Looks up parcel from registry and moves.', {
    destination: zod_1.z.string().describe('Scene name or id e.g. "Agent Gateway" or "lowdown-demo"'),
    agentId: zod_1.z.string().optional().describe('Agent identifier for Lowdown recording'),
}, async ({ destination, agentId }) => {
    const result = await (0, navigateTo_js_1.navigateTo)({ destination, agentId });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
});
server.tool('record_outcome', 'Record a structured action outcome to Lowdown. Use after any significant agent action.', {
    agentId: zod_1.z.string().describe('Agent identifier'),
    action: zod_1.z.string().describe('Action performed e.g. "interact", "navigate", "observe"'),
    target: zod_1.z.string().describe('Target entity or parcel'),
    targetType: zod_1.z.enum(['entity', 'scene', 'parcel', 'service']).optional().default('entity'),
    outcome: zod_1.z.enum(['success', 'not_found', 'error']).describe('Action result'),
    result: zod_1.z.string().optional().describe('JSON string with additional result data'),
}, async ({ agentId, action, target, targetType, outcome, result }) => {
    const parsed = result ? JSON.parse(result) : undefined;
    const recorded = await (0, client_js_1.recordOutcome)({ agentId, action, target, targetType, outcome, result: parsed });
    return { content: [{ type: 'text', text: JSON.stringify(recorded, null, 2) }] };
});
// ?? REST / Lowdown tools ?????????????????????????????????????????????????????
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
// ?? Start ????????????????????????????????????????????????????????????????????
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error('[dcl-agent-mcp] v0.3.0 running on stdio');
}
main();
