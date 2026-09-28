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
dotenv_1.default.config();
const server = new mcp_js_1.McpServer({
    name: 'dcl-agent-mcp',
    version: '0.1.0'
});
server.tool('enter_world', 'Enter a Decentraland parcel and get scene info', { parcel: zod_1.z.string().describe('Parcel coordinates e.g. "46,115"') }, async ({ parcel }) => {
    const result = await (0, enterWorld_js_1.enterWorld)(parcel);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
});
server.tool('observe', 'Observe current parcel scene and tile info', { parcel: zod_1.z.string().describe('Parcel coordinates e.g. "46,115"') }, async ({ parcel }) => {
    const result = await (0, observe_js_1.observe)(parcel);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
});
server.tool('record_visit', 'Record agent visit to Lowdown', {
    agentId: zod_1.z.string().describe('Agent identifier'),
    parcel: zod_1.z.string().describe('Parcel coordinates e.g. "46,115"'),
    outcome: zod_1.z.string().describe('Visit outcome e.g. "success"')
}, async ({ agentId, parcel, outcome }) => {
    const result = await (0, recordVisit_js_1.recordVisit)({ agentId, parcel, outcome });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
});
server.tool('register_scene', 'Register a Decentraland scene for AI agent discovery', {
    parcel: zod_1.z.string().describe('Parcel coordinates e.g. "46,115"'),
    name: zod_1.z.string().describe('Scene name'),
    description: zod_1.z.string().optional().describe('Scene description'),
    category: zod_1.z.enum(['ai_service', 'art', 'game', 'shop', 'event', 'education', 'other']),
    services: zod_1.z.string().optional().describe('Services offered, comma separated'),
    agentInstructions: zod_1.z.string().optional().describe('Instructions for AI agents visiting this scene'),
    owner: zod_1.z.string().optional().describe('Owner wallet or name')
}, async (params) => {
    const result = await (0, registerScene_js_1.registerScene)(params);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
});
server.tool('explore', 'Autonomously explore nearby parcels not yet visited, record to Lowdown', {
    agentId: zod_1.z.string().describe('Agent identifier'),
    baseParcel: zod_1.z.string().describe('Base parcel to explore around e.g. "46,115"'),
    radius: zod_1.z.number().optional().describe('Search radius in parcels, default 3')
}, async ({ agentId, baseParcel, radius }) => {
    const result = await (0, explore_js_1.explore)({ agentId, baseParcel, radius });
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
});
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error('[dcl-agent-mcp] running on stdio');
}
main();
