"use strict";
/**
 * PulseBridge — singleton that manages DCLPulseTestClient.exe in --bridge mode.
 *
 * One exe process, one Pulse connection at a time.
 * Commands are serialized (one in-flight at a time) via a simple pending-resolve queue.
 *
 * Env vars (all optional, have sensible defaults for local dev):
 *   PULSE_EXE_PATH   — path to DCLPulseTestClient.exe
 *   PULSE_AUTH_DIR   — directory with auth-chain.json + ephemeral-key.json
 *   PULSE_SERVER_IP  — Pulse server hostname (default: pulse-server.decentraland.org)
 *   PULSE_SERVER_PORT — Pulse server port (default: 7777)
 *   PULSE_REALM      — realm name (default: main)
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
exports.pulseBridge = void 0;
const child_process_1 = require("child_process");
const readline = __importStar(require("readline"));
const path_1 = __importDefault(require("path"));
// ── Singleton class ──────────────────────────────────────────────────────────
const COMMAND_TIMEOUT_MS = 30000;
class PulseBridge {
    constructor() {
        this.proc = null;
        this.rl = null;
        this.pendingResolve = null;
        this.pendingReject = null;
        this._connected = false;
    }
    // ── Config helpers ──────────────────────────────────────────────────────
    get exePath() {
        return (process.env.PULSE_EXE_PATH ??
            path_1.default.resolve(__dirname, '../../pulse-test/DCLPulseTestClient/src/DCLPulseTestClient/bin/Debug/net10.0/DCLPulseTestClient.exe'));
    }
    get authDir() {
        return process.env.PULSE_AUTH_DIR ?? path_1.default.resolve(__dirname, '../../pulse-test');
    }
    get serverIp() {
        return process.env.PULSE_SERVER_IP ?? 'pulse-server.decentraland.org';
    }
    get serverPort() {
        return process.env.PULSE_SERVER_PORT ?? '7777';
    }
    get realm() {
        return process.env.PULSE_REALM ?? 'main';
    }
    // ── Process management ──────────────────────────────────────────────────
    spawnProcess() {
        const args = [
            '--bridge',
            `--auth-dir=${this.authDir}`,
            `--ip=${this.serverIp}`,
            `--port=${this.serverPort}`,
            `--realm=${this.realm}`,
        ];
        console.error(`[PulseBridge] spawning: ${this.exePath} ${args.join(' ')}`);
        this.proc = (0, child_process_1.spawn)(this.exePath, args, {
            stdio: ['pipe', 'pipe', 'inherit'], // stdin/stdout piped; stderr goes straight to our stderr
        });
        this.rl = readline.createInterface({ input: this.proc.stdout });
        this.rl.on('line', (line) => {
            const trimmed = line.trim();
            if (!trimmed)
                return;
            // Ignore non-JSON lines (e.g. "Transport: ENet" printed before bridge mode starts)
            if (!trimmed.startsWith('{')) {
                console.error(`[PulseBridge] ignored non-JSON: ${trimmed}`);
                return;
            }
            let response;
            try {
                response = JSON.parse(trimmed);
            }
            catch {
                console.error('[PulseBridge] JSON parse error:', trimmed);
                return;
            }
            const resolve = this.pendingResolve;
            const reject = this.pendingReject;
            this.pendingResolve = null;
            this.pendingReject = null;
            if (resolve) {
                resolve(response);
            }
            else {
                console.error('[PulseBridge] unsolicited response:', trimmed);
            }
        });
        this.proc.on('exit', (code) => {
            console.error(`[PulseBridge] process exited (code=${code})`);
            this._connected = false;
            this.proc = null;
            this.rl = null;
            if (this.pendingReject) {
                this.pendingReject(new Error(`Bridge process exited (code=${code})`));
                this.pendingResolve = null;
                this.pendingReject = null;
            }
        });
        this.proc.on('error', (err) => {
            console.error('[PulseBridge] spawn error:', err.message);
            this._connected = false;
            if (this.pendingReject) {
                this.pendingReject(err);
                this.pendingResolve = null;
                this.pendingReject = null;
            }
        });
    }
    // ── Low-level send ──────────────────────────────────────────────────────
    send(cmd) {
        if (!this.proc || this.proc.exitCode !== null) {
            return Promise.reject(new Error('Bridge process is not running'));
        }
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pendingResolve = null;
                this.pendingReject = null;
                reject(new Error(`Bridge command timed out after ${COMMAND_TIMEOUT_MS}ms`));
            }, COMMAND_TIMEOUT_MS);
            this.pendingResolve = (r) => { clearTimeout(timer); resolve(r); };
            this.pendingReject = (e) => { clearTimeout(timer); reject(e); };
            const line = JSON.stringify(cmd) + '\n';
            this.proc.stdin.write(line);
        });
    }
    // ── Public API ──────────────────────────────────────────────────────────
    /** Connect to DCL. Spawns the bridge process if not already running. */
    async connect(parcel) {
        // Spawn if needed
        if (!this.proc || this.proc.exitCode !== null) {
            this.spawnProcess();
            // Give the .NET runtime a moment to start and print "Transport: ENet" before we send
            await new Promise((r) => setTimeout(r, 800));
        }
        const cmd = { cmd: 'connect' };
        if (parcel)
            cmd.parcel = parcel;
        const result = await this.send(cmd);
        if (result.ok)
            this._connected = true;
        return result;
    }
    /** Returns current avatar position. */
    async getPosition() {
        return this.send({ cmd: 'get_position' });
    }
    /**
     * Teleport avatar to world coordinates.
     * To move by parcel: x = parcel_x * 16 + 8, z = parcel_z * 16 + 8
     */
    async move(x, y, z) {
        return this.send({ cmd: 'move', x, y, z });
    }
    /** Returns current wallet + position (no REST call). */
    async observe() {
        return this.send({ cmd: 'observe' });
    }
    /** Gracefully disconnect and kill the process. */
    async disconnect() {
        const result = await this.send({ cmd: 'disconnect' });
        this._connected = false;
        return result;
    }
    /** True if the bridge process is alive and connected to DCL. */
    get isConnected() {
        return this._connected && this.proc !== null && this.proc.exitCode === null;
    }
}
// Export singleton
exports.pulseBridge = new PulseBridge();
