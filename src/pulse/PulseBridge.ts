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

import { spawn, ChildProcess } from 'child_process'
import * as readline from 'readline'
import path from 'path'
import { fileURLToPath } from 'url'

// CommonJS 환경 — __dirname is available globally

// ── Types ────────────────────────────────────────────────────────────────────

export interface Position {
  x: number
  y: number
  z: number
}

export interface BridgeResponse {
  ok: boolean
  error?: string
  connected?: boolean
  already?: boolean
  disconnected?: boolean
  wallet?: string
  position?: Position
}

// ── Singleton class ──────────────────────────────────────────────────────────

const COMMAND_TIMEOUT_MS = 30_000

class PulseBridge {
  private proc: ChildProcess | null = null
  private rl: readline.Interface | null = null
  private pendingResolve: ((r: BridgeResponse) => void) | null = null
  private pendingReject: ((e: Error) => void) | null = null
  private _connected = false

  // ── Config helpers ──────────────────────────────────────────────────────

  private get exePath(): string {
    return (
      process.env.PULSE_EXE_PATH ??
      path.resolve(
        __dirname,
        '../../pulse-test/DCLPulseTestClient/src/DCLPulseTestClient/bin/Debug/net10.0/DCLPulseTestClient.exe'
      )
    )
  }

  private get authDir(): string {
    return process.env.PULSE_AUTH_DIR ?? path.resolve(__dirname, '../../pulse-test')
  }

  private get serverIp(): string {
    return process.env.PULSE_SERVER_IP ?? 'pulse-server.decentraland.org'
  }

  private get serverPort(): string {
    return process.env.PULSE_SERVER_PORT ?? '7777'
  }

  private get realm(): string {
    return process.env.PULSE_REALM ?? 'main'
  }

  // ── Process management ──────────────────────────────────────────────────

  private spawnProcess(): void {
    const args = [
      '--bridge',
      `--auth-dir=${this.authDir}`,
      `--ip=${this.serverIp}`,
      `--port=${this.serverPort}`,
      `--realm=${this.realm}`,
    ]

    console.error(`[PulseBridge] spawning: ${this.exePath} ${args.join(' ')}`)

    this.proc = spawn(this.exePath, args, {
      stdio: ['pipe', 'pipe', 'inherit'], // stdin/stdout piped; stderr goes straight to our stderr
    })

    this.rl = readline.createInterface({ input: this.proc.stdout! })

    this.rl.on('line', (line) => {
      const trimmed = line.trim()
      if (!trimmed) return

      // Ignore non-JSON lines (e.g. "Transport: ENet" printed before bridge mode starts)
      if (!trimmed.startsWith('{')) {
        console.error(`[PulseBridge] ignored non-JSON: ${trimmed}`)
        return
      }

      let response: BridgeResponse
      try {
        response = JSON.parse(trimmed)
      } catch {
        console.error('[PulseBridge] JSON parse error:', trimmed)
        return
      }

      const resolve = this.pendingResolve
      const reject = this.pendingReject
      this.pendingResolve = null
      this.pendingReject = null

      if (resolve) {
        resolve(response)
      } else {
        console.error('[PulseBridge] unsolicited response:', trimmed)
      }
    })

    this.proc.on('exit', (code) => {
      console.error(`[PulseBridge] process exited (code=${code})`)
      this._connected = false
      this.proc = null
      this.rl = null

      if (this.pendingReject) {
        this.pendingReject(new Error(`Bridge process exited (code=${code})`))
        this.pendingResolve = null
        this.pendingReject = null
      }
    })

    this.proc.on('error', (err) => {
      console.error('[PulseBridge] spawn error:', err.message)
      this._connected = false

      if (this.pendingReject) {
        this.pendingReject(err)
        this.pendingResolve = null
        this.pendingReject = null
      }
    })
  }

  // ── Low-level send ──────────────────────────────────────────────────────

  private send(cmd: object): Promise<BridgeResponse> {
    if (!this.proc || this.proc.exitCode !== null) {
      return Promise.reject(new Error('Bridge process is not running'))
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingResolve = null
        this.pendingReject = null
        reject(new Error(`Bridge command timed out after ${COMMAND_TIMEOUT_MS}ms`))
      }, COMMAND_TIMEOUT_MS)

      this.pendingResolve = (r) => { clearTimeout(timer); resolve(r) }
      this.pendingReject = (e) => { clearTimeout(timer); reject(e) }

      const line = JSON.stringify(cmd) + '\n'
      this.proc!.stdin!.write(line)
    })
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /** Connect to DCL. Spawns the bridge process if not already running. */
  async connect(parcel?: string): Promise<BridgeResponse> {
    // Spawn if needed
    if (!this.proc || this.proc.exitCode !== null) {
      this.spawnProcess()
      // Give the .NET runtime a moment to start and print "Transport: ENet" before we send
      await new Promise((r) => setTimeout(r, 800))
    }

    const cmd: Record<string, unknown> = { cmd: 'connect' }
    if (parcel) cmd.parcel = parcel

    const result = await this.send(cmd)
    if (result.ok) this._connected = true
    return result
  }

  /** Returns current avatar position. */
  async getPosition(): Promise<BridgeResponse> {
    return this.send({ cmd: 'get_position' })
  }

  /**
   * Teleport avatar to world coordinates.
   * To move by parcel: x = parcel_x * 16 + 8, z = parcel_z * 16 + 8
   */
  async move(x: number, y: number, z: number): Promise<BridgeResponse> {
    return this.send({ cmd: 'move', x, y, z })
  }

  /** Returns current wallet + position (no REST call). */
  async observe(): Promise<BridgeResponse> {
    return this.send({ cmd: 'observe' })
  }

  /** Gracefully disconnect and kill the process. */
  async disconnect(): Promise<BridgeResponse> {
    const result = await this.send({ cmd: 'disconnect' })
    this._connected = false
    return result
  }

  /** True if the bridge process is alive and connected to DCL. */
  get isConnected(): boolean {
    return this._connected && this.proc !== null && this.proc.exitCode === null
  }
}

// Export singleton
export const pulseBridge = new PulseBridge()
