"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerScene = registerScene;
const axios_1 = __importDefault(require("axios"));
const LOWDOWN_URL = process.env.LOWDOWN_API_URL;
async function registerScene(params) {
    const res = await axios_1.default.post(`${LOWDOWN_URL}/api/scenes`, {
        parcel: params.parcel,
        name: params.name,
        description: params.description ?? null,
        category: params.category,
        services: params.services ?? null,
        agent_instructions: params.agentInstructions ?? null,
        owner: params.owner ?? null
    });
    return res.data;
}
