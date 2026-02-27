#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh  —  Build & deploy the Live Poll contract to Stellar Testnet
# Prerequisites: stellar CLI installed, soroban toolchain
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

NETWORK="testnet"
RPC_URL="https://soroban-testnet.stellar.org"
NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
ACCOUNT_ALIAS="deployer"       # stellar CLI account alias
WASM_PATH="target/wasm32-unknown-unknown/release/live_poll.wasm"

echo "═══════════════════════════════════════════════"
echo "  Live Poll — Testnet Deployment"
echo "═══════════════════════════════════════════════"

# 1. Build
echo ""
echo "▶ Building contract..."
stellar contract build

# 2. Optimize
echo ""
echo "▶ Optimizing WASM..."
stellar contract optimize --wasm "$WASM_PATH"
OPTIMIZED_WASM="${WASM_PATH%.wasm}.optimized.wasm"

# 3. Deploy
echo ""
echo "▶ Deploying to testnet..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm "$OPTIMIZED_WASM" \
  --source "$ACCOUNT_ALIAS" \
  --network "$NETWORK" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE")

echo ""
echo "✅ Contract deployed!"
echo "   Contract ID: $CONTRACT_ID"

# 4. Fund account if needed
ADMIN_ADDRESS=$(stellar keys address "$ACCOUNT_ALIAS")
echo "   Admin:       $ADMIN_ADDRESS"

# 5. Initialize the poll
echo ""
echo "▶ Initializing poll..."
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source "$ACCOUNT_ALIAS" \
  --network "$NETWORK" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE" \
  -- initialize \
  --admin "$ADMIN_ADDRESS" \
  --question "Should Stellar adopt proof-of-stake consensus?" \
  --option_a "Yes, upgrade now" \
  --option_b "No, keep current model"

echo ""
echo "✅ Poll initialized!"
echo ""
echo "─────────────────────────────────────────────"
echo "  Copy this Contract ID into your .env file:"
echo "  VITE_CONTRACT_ID=$CONTRACT_ID"
echo "─────────────────────────────────────────────"

# Save to .env automatically
ENV_FILE="../frontend/.env"
if [ -f "$ENV_FILE" ]; then
  # Update existing
  sed -i "s/VITE_CONTRACT_ID=.*/VITE_CONTRACT_ID=$CONTRACT_ID/" "$ENV_FILE"
else
  echo "VITE_CONTRACT_ID=$CONTRACT_ID" >> "$ENV_FILE"
fi
echo "✅ .env updated: $ENV_FILE"