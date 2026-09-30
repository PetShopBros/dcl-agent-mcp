/**
 * generate-auth.js  — 1회 실행: DCL identity 키 쌍 생성
 * Usage: node generate-auth.js
 * Output: auth-chain.json (SIGNER + ECDSA_EPHEMERAL), ephemeral-key.json (private keys)
 */

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

async function main() {
  const signerWallet = ethers.Wallet.createRandom();
  const ephemeralWallet = ethers.Wallet.createRandom();

  const expiration = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  const ephemeralPayload = `Decentraland Login\nEphemeral address: ${ephemeralWallet.address}\nExpiration: ${expiration}`;
  const ephemeralSignature = await signerWallet.signMessage(ephemeralPayload);

  const authChain = [
    { type: "SIGNER",          payload: signerWallet.address, signature: "" },
    { type: "ECDSA_EPHEMERAL", payload: ephemeralPayload,     signature: ephemeralSignature }
  ];

  const keyData = {
    signerAddress:       signerWallet.address,
    signerPrivateKey:    signerWallet.privateKey,
    ephemeralAddress:    ephemeralWallet.address,
    ephemeralPrivateKey: ephemeralWallet.privateKey,
    expiration
  };

  const outDir = __dirname;
  fs.writeFileSync(path.join(outDir, "auth-chain.json"),   JSON.stringify(authChain, null, 2));
  fs.writeFileSync(path.join(outDir, "ephemeral-key.json"), JSON.stringify(keyData,   null, 2));

  console.log("✓ auth-chain.json saved");
  console.log("✓ ephemeral-key.json saved (keep secret!)");
  console.log("  Signer (DCL identity):", signerWallet.address);
  console.log("  Ephemeral:            ", ephemeralWallet.address);
  console.log("  Expires:              ", expiration);
}

main().catch(e => { console.error(e); process.exit(1); });
