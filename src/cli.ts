#!/usr/bin/env node
/**
 * CLI entry point for dcl-agent-mcp.
 * Usage:
 *   dcl-agent-mcp setup   → run interactive setup wizard
 *   dcl-agent-mcp         → start MCP server
 */

import path from 'path'
import os from 'os'
import fs from 'fs'
import { config } from 'dotenv'

// Load .env from ~/.dcl-agent-mcp/.env if it exists and no override given
const defaultEnvPath = path.join(os.homedir(), '.dcl-agent-mcp', '.env')
const envPath = process.env.DOTENV_CONFIG_PATH ?? (fs.existsSync(defaultEnvPath) ? defaultEnvPath : undefined)
if (envPath) config({ path: envPath })

const cmd = process.argv[2]

if (cmd === 'setup') {
  import('./setup/setup.js').then(m => m.setupCommand())
} else {
  import('./server.js')
}
