"use strict";
/**
 * Setup wizard for dcl-agent-mcp.
 * - Creates ~/.dcl-agent-mcp/
 * - Downloads DCLPulseTestClient.exe from GitHub Releases
 * - Writes .env
 * - Registers MCP server in Claude Desktop config
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupCommand = setupCommand;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const https_1 = __importDefault(require("https"));
const DIR = path_1.default.join(os_1.default.homedir(), '.dcl-agent-mcp');
const EXE_PATH = path_1.default.join(DIR, 'DCLPulseTestClient.exe');
const ENV_PATH = path_1.default.join(DIR, '.env');
const EXE_URL = 'https://github.com/PetShopBros/dcl-agent-mcp/releases/latest/download/DCLPulseTestClient.exe';
function ensureDir(p) {
    if (!fs_1.default.existsSync(p))
        fs_1.default.mkdirSync(p, { recursive: true });
}
function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        console.log(`  Downloading ${url} ...`);
        const file = fs_1.default.createWriteStream(dest);
        const get = (u) => https_1.default.get(u, res => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                get(res.headers.location);
                return;
            }
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}`));
                return;
            }
            res.pipe(file);
            file.on('finish', () => file.close(() => resolve()));
        }).on('error', reject);
        get(url);
    });
}
function writeEnv(exePath, authDir, lowdownUrl) {
    const content = [
        `PULSE_EXE_PATH=${exePath}`,
        `PULSE_AUTH_DIR=${authDir}`,
        `LOWDOWN_API_URL=${lowdownUrl}`,
    ].join('\n') + '\n';
    fs_1.default.writeFileSync(ENV_PATH, content, 'utf8');
}
function registerClaudeDesktop(envPath) {
    const configDir = process.platform === 'win32'
        ? path_1.default.join(process.env.APPDATA ?? '', 'Claude')
        : path_1.default.join(os_1.default.homedir(), 'Library', 'Application Support', 'Claude');
    const configPath = path_1.default.join(configDir, 'claude_desktop_config.json');
    let cfg = {};
    if (fs_1.default.existsSync(configPath)) {
        try {
            cfg = JSON.parse(fs_1.default.readFileSync(configPath, 'utf8'));
        }
        catch { }
    }
    cfg.mcpServers = cfg.mcpServers ?? {};
    cfg.mcpServers['dcl-agent-mcp'] = {
        command: 'npx',
        args: ['dcl-agent-mcp'],
        env: { DOTENV_CONFIG_PATH: envPath },
    };
    ensureDir(configDir);
    fs_1.default.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf8');
    console.log(`  Claude Desktop config updated: ${configPath}`);
}
async function setupCommand() {
    console.log('\n=== dcl-agent-mcp setup ===\n');
    // 1. Create dir
    ensureDir(DIR);
    console.log(`✓ Directory: ${DIR}`);
    // 2. Download exe if not present
    if (!fs_1.default.existsSync(EXE_PATH)) {
        try {
            await downloadFile(EXE_URL, EXE_PATH);
            console.log(`✓ DCLPulseTestClient.exe downloaded`);
        }
        catch (e) {
            console.warn(`⚠ Download failed: ${e.message}`);
            console.warn(`  Place DCLPulseTestClient.exe manually at: ${EXE_PATH}`);
        }
    }
    else {
        console.log(`✓ DCLPulseTestClient.exe already exists`);
    }
    // 3. Write .env
    const authDir = path_1.default.join(DIR, 'auth');
    ensureDir(authDir);
    writeEnv(EXE_PATH, authDir, 'https://lowdown-proxy.vercel.app');
    console.log(`✓ .env written: ${ENV_PATH}`);
    // 4. Register in Claude Desktop
    try {
        registerClaudeDesktop(ENV_PATH);
        console.log(`✓ Registered in Claude Desktop`);
    }
    catch (e) {
        console.warn(`⚠ Claude Desktop registration failed: ${e.message}`);
        console.warn(`  Add manually: npx dcl-agent-mcp`);
    }
    console.log('\n✅ Setup complete! Restart Claude Desktop to activate.\n');
}
