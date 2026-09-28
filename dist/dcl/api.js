"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.teleportTo = teleportTo;
exports.getParcelInfo = getParcelInfo;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const CATALYST_URL = 'https://peer-lb.decentraland.org';
const EXPLORER_MCP_URL = process.env.EXPLORER_MCP_URL ?? 'http://127.0.0.1:8123';
let mcpSessionId = null;
async function getExplorerSession() {
    try {
        const res = await axios_1.default.post(`${EXPLORER_MCP_URL}/unity-explorer-mcp`, { jsonrpc: '2.0', method: 'initialize', id: 1, params: {} }, { headers: { 'Content-Type': 'application/json' } });
        return res.headers['mcp-session-id'] ?? null;
    }
    catch {
        return null;
    }
}
async function teleportTo(parcel) {
    try {
        if (!mcpSessionId)
            mcpSessionId = await getExplorerSession();
        if (!mcpSessionId)
            return false;
        const [x, y] = parcel.split(',').map(Number);
        await axios_1.default.post(`${EXPLORER_MCP_URL}/unity-explorer-mcp`, {
            jsonrpc: '2.0',
            method: 'tools/call',
            id: 2,
            params: {
                name: 'send_chat',
                arguments: { message: `/goto ${x},${y}` }
            }
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Mcp-Session-Id': mcpSessionId
            }
        });
        return true;
    }
    catch {
        return false;
    }
}
async function getParcelInfo(parcel) {
    const [x, y] = parcel.split(',').map(Number);
    const places = await axios_1.default.get(`https://places.decentraland.org/api/places?positions=${x},${y}`);
    const scene = places.data?.data?.[0] ?? null;
    return {
        parcel,
        scene,
        tile: null
    };
}
