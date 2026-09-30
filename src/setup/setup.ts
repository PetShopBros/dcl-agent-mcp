/**
 * Setup wizard for dcl-agent-mcp.
 * - Creates ~/.dcl-agent-mcp/
 * - Downloads DCLPulseTestClient.exe from GitHub Releases
 * - Writes .env
 * - Registers MCP server in Claude Desktop config
 */

import fs from 'fs'
import path from 'path'
import os from 'os'
import https from 'https'
import { execSync } from 'child_process'

const DIR = path.join(os.homedir(), '.dcl-agent-mcp')
const EXE_PATH = path.join(DIR, 'DCLPulseTestClient.exe')
const ENV_PATH = path.join(DIR, '.env')
const EXE_URL =
  'https://github.com/PetShopBros/dcl-agent-mcp/releases/latest/download/DCLPulseTestClient.exe'

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`  Downloading ${url} ...`)
    const file = fs.createWriteStream(dest)
    const get = (u: string) =>
      https.get(u, res => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          get(res.headers.location!)
          return
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`))
          return
        }
        res.pipe(file)
        file.on('finish', () => file.close(() => resolve()))
      }).on('error', reject)
    get(url)
  })
}

function writeEnv(exePath: string, authDir: string, lowdownUrl: string) {
  const content = [
    `PULSE_EXE_PATH=${exePath}`,
    `PULSE_AUTH_DIR=${authDir}`,
    `LOWDOWN_API_URL=${lowdownUrl}`,
  ].join('\n') + '\n'
  fs.writeFileSync(ENV_PATH, content, 'utf8')
}

function registerClaudeDesktop(envPath: string) {
  const configDir =
    process.platform === 'win32'
      ? path.join(process.env.APPDATA ?? '', 'Claude')
      : path.join(os.homedir(), 'Library', 'Application Support', 'Claude')
  const configPath = path.join(configDir, 'claude_desktop_config.json')

  let cfg: any = {}
  if (fs.existsSync(configPath)) {
    try { cfg = JSON.parse(fs.readFileSync(configPath, 'utf8')) } catch {}
  }

  cfg.mcpServers = cfg.mcpServers ?? {}
  cfg.mcpServers['dcl-agent-mcp'] = {
    command: 'npx',
    args: ['dcl-agent-mcp'],
    env: { DOTENV_CONFIG_PATH: envPath },
  }

  ensureDir(configDir)
  fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf8')
  console.log(`  Claude Desktop config updated: ${configPath}`)
}

export async function setupCommand() {
  console.log('\n=== dcl-agent-mcp setup ===\n')

  // 1. Create dir
  ensureDir(DIR)
  console.log(`✓ Directory: ${DIR}`)

  // 2. Download exe if not present
  if (!fs.existsSync(EXE_PATH)) {
    try {
      await downloadFile(EXE_URL, EXE_PATH)
      console.log(`✓ DCLPulseTestClient.exe downloaded`)
    } catch (e: any) {
      console.warn(`⚠ Download failed: ${e.message}`)
      console.warn(`  Place DCLPulseTestClient.exe manually at: ${EXE_PATH}`)
    }
  } else {
    console.log(`✓ DCLPulseTestClient.exe already exists`)
  }

  // 3. Write .env
  const authDir = path.join(DIR, 'auth')
  ensureDir(authDir)
  writeEnv(EXE_PATH, authDir, 'https://lowdown-proxy.vercel.app')
  console.log(`✓ .env written: ${ENV_PATH}`)

  // 4. Register in Claude Desktop
  try {
    registerClaudeDesktop(ENV_PATH)
    console.log(`✓ Registered in Claude Desktop`)
  } catch (e: any) {
    console.warn(`⚠ Claude Desktop registration failed: ${e.message}`)
    console.warn(`  Add manually: npx dcl-agent-mcp`)
  }

  console.log('\n✅ Setup complete! Restart Claude Desktop to activate.\n')
}
