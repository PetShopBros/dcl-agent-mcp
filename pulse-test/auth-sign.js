/**
 * auth-sign.js  — FileAuthenticator.cs 가 subprocess로 호출
 *
 * Commands:
 *   node auth-sign.js login  --dir <path>
 *     → stdout: {"authChainJson":"<json>","walletAddress":"0x..."}
 *
 *   node auth-sign.js sign   --dir <path> --payload <string...>
 *     → stdout: JSON array (AuthLink[])
 */

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const cmd = args[0];

function getArg(name) {
  const i = args.indexOf("--" + name);
  return i >= 0 ? args[i + 1] : null;
}

function getRestArg(name) {
  const i = args.indexOf("--" + name);
  return i >= 0 ? args.slice(i + 1).join(" ") : null;
}

async function main() {
  const dir = getArg("dir") || __dirname;
  const chain = JSON.parse(fs.readFileSync(path.join(dir, "auth-chain.json"), "utf8"));
  const keys  = JSON.parse(fs.readFileSync(path.join(dir, "ephemeral-key.json"), "utf8"));

  const ephemeralWallet = new ethers.Wallet(keys.ephemeralPrivateKey);
  const signerLink    = chain.find(l => l.type === "SIGNER");
  const ephemeralLink = chain.find(l => l.type === "ECDSA_EPHEMERAL");

  if (cmd === "login") {
    const timestamp = Date.now().toString();
    const metadata  = "{}";
    const payload   = `connect:/:${timestamp}:${metadata}`;
    const signature = await ephemeralWallet.signMessage(payload);

    const links = [
      { type: "SIGNER",              payload: signerLink.payload,    signature: "" },
      { type: "ECDSA_EPHEMERAL",     payload: ephemeralLink.payload, signature: ephemeralLink.signature },
      { type: "ECDSA_SIGNED_ENTITY", payload,                        signature }
    ];

    // Build x-identity-* header object (same format MetaForge outputs)
    const headers = {};
    links.forEach((link, i) => {
      headers[`x-identity-auth-chain-${i}`] = JSON.stringify(link);
    });
    headers["x-identity-timestamp"] = timestamp;
    headers["x-identity-metadata"]  = metadata;

    console.log(JSON.stringify({
      authChainJson: JSON.stringify(headers),
      walletAddress: keys.signerAddress
    }));

  } else if (cmd === "sign") {
    const payload   = getRestArg("payload");
    if (!payload) { console.error("--payload required"); process.exit(1); }
    const signature = await ephemeralWallet.signMessage(payload);

    const links = [
      { type: "SIGNER",              payload: signerLink.payload,    signature: "" },
      { type: "ECDSA_EPHEMERAL",     payload: ephemeralLink.payload, signature: ephemeralLink.signature },
      { type: "ECDSA_SIGNED_ENTITY", payload,                        signature }
    ];

    console.log(JSON.stringify(links));

  } else {
    console.error(`Unknown command: ${cmd}. Use 'login' or 'sign'.`);
    process.exit(1);
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
