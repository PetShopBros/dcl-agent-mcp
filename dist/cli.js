#!/usr/bin/env node
"use strict";
/**
 * CLI entry point for dcl-agent-mcp.
 * Usage:
 *   dcl-agent-mcp setup   → run interactive setup wizard
 *   dcl-agent-mcp         → start MCP server
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = require("dotenv");
// Load .env from ~/.dcl-agent-mcp/.env if it exists and no override given
const defaultEnvPath = path_1.default.join(os_1.default.homedir(), '.dcl-agent-mcp', '.env');
const envPath = process.env.DOTENV_CONFIG_PATH ?? (fs_1.default.existsSync(defaultEnvPath) ? defaultEnvPath : undefined);
if (envPath)
    (0, dotenv_1.config)({ path: envPath });
const cmd = process.argv[2];
if (cmd === 'setup') {
    Promise.resolve().then(() => __importStar(require('./setup/setup.js'))).then(m => m.setupCommand());
}
else {
    Promise.resolve().then(() => __importStar(require('./server.js')));
}
