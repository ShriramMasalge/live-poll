# 🗳️ LivePoll — Stellar Testnet dApp

A real-time, on-chain voting app built with **Soroban smart contracts** and **StellarWalletsKit**. One question. Two options. Every vote recorded immutably on the Stellar Testnet.

---

## 📁 Project Structure

```
live-poll/
├── contract/              # Soroban Rust smart contract
│   ├── src/lib.rs         # Contract logic
│   ├── Cargo.toml
│   └── deploy.sh          # Build + deploy + init script
│
└── frontend/              # React + Vite dApp
    ├── src/
    │   ├── App.jsx         # Main UI
    │   ├── index.css       # Styles
    │   ├── lib/
    │   │   └── stellar.js  # Soroban RPC helpers, event polling
    │   └── hooks/
    │       ├── useWallet.js  # StellarWalletsKit integration
    │       └── usePoll.js    # Poll state + voting + tx tracking
    ├── .env.example
    └── package.json
```

---

## 🚀 Quick Start

### Prerequisites
- [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli) installed
- Rust + `wasm32-unknown-unknown` target: `rustup target add wasm32-unknown-unknown`
- Node.js 18+

### 1. Fund a testnet account
```bash
stellar keys generate deployer --network testnet
stellar keys address deployer
# Fund it:
curl "https://friendbot.stellar.org/?addr=$(stellar keys address deployer)"
```

### 2. Deploy the contract
```bash
cd contract
bash deploy.sh
# ✅ This builds, deploys, initializes, and writes VITE_CONTRACT_ID to frontend/.env
```

### 3. Run the frontend
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## ✅ Level 2 Requirements Checklist

### 🔌 StellarWalletsKit Integration
- [x] `StellarWalletsKit` initialized with `allowAllModules()`  
- [x] Multi-wallet modal (Freighter, LOBSTR, xBull, etc.)  
- [x] `WalletNetwork.TESTNET` configured  
- [x] `getAddress()` and `signTransaction()` implemented

### ⚠️ 3 Error Types Handled
| Error | Code | User Message |
|-------|------|-------------|
| `NOT_FOUND` | Extension not installed | "Please install Freighter, LOBSTR, or xBull" |
| `REJECTED` | User denied signing | "You rejected the request. Click again when ready." |
| `INSUFFICIENT_FUNDS` | Low XLM balance | "Fund your testnet account at friendbot.stellar.org" |

Plus: `NETWORK_ERROR` and `UNKNOWN` fallbacks.

### 🏗️ Contract Deployed on Testnet
- [x] Soroban contract in `contract/src/lib.rs`
- [x] `deploy.sh` builds, optimizes, deploys, and initializes
- [x] Contract ID written to `frontend/.env` automatically

### 📡 Contract Called from Frontend
- [x] `buildVoteTx()` constructs Soroban invocation
- [x] `signTx()` via StellarWalletsKit
- [x] `submitAndWait()` sends to testnet RPC
- [x] `fetchPollData()` reads `get_poll()` and `results()`
- [x] `fetchHasVoted()` reads `has_voted()` per address

### ⏱️ Transaction Status Visible
```
IDLE → PENDING (Broadcasting…) → SUCCESS ✓ / FAILED ✗
```
- [x] Tx hash displayed with link to stellar.expert
- [x] Animated status badge in UI

### 🔄 Real-time Event Integration
- [x] `startEventPolling()` polls RPC every 5s
- [x] Detects vote count changes and updates UI
- [x] "● LIVE" pulse indicator in header when new vote detected
- [x] Vote bars animate smoothly on update

### 📝 Smart Contract Features
- `initialize()` — Set question, options, admin  
- `vote()` — Cast vote (auth required, one-per-address, option 0 or 1)  
- `results()` — Read current vote counts  
- `has_voted()` — Check if address voted  
- `get_poll()` — Get metadata  
- `close_poll()` — Admin closes poll  
- Events emitted: `poll_init`, `voted`, `closed`

---

## 🔗 Links
- [Stellar Expert (Testnet)](https://stellar.expert/explorer/testnet)
- [Friendbot Faucet](https://friendbot.stellar.org)
- [Soroban Docs](https://developers.stellar.org/docs/build/smart-contracts)
- [StellarWalletsKit](https://github.com/Creit-Tech/Stellar-Wallets-Kit)# 🗳️ LivePoll — On-Chain Voting on Stellar Testnet

A real-time, one-question polling app powered by a Soroban smart contract on the Stellar testnet. Users connect their Freighter wallet and cast a single on-chain vote. Results update live every 5 seconds.

---

## 📸 Screenshots


1) CONNECTING WALLET BEFORE VOTE
<img width="945" height="530" alt="CONNECTING WALLET BEFORE VOTE" src="https://github.com/user-attachments/assets/51bd8ff7-4cc0-4e41-8e42-f044906cd815" />



2) YOUR VOTING RIGHT
<img width="872" height="422" alt="YOUR VOTING RIGHT" src="https://github.com/user-attachments/assets/35bf2ed6-56d9-47a2-9ad1-b8bc2f277dc8" />



3) CONFIRMATION OF YOUR VOTE
<img width="868" height="457" alt="CONFIRMATION OF YOUR VOTE" src="https://github.com/user-attachments/assets/6dd18500-aad6-4c75-a41d-03f201b5f056" />



4) CONGRATS YOU HAVE VOTED
<img width="592" height="380" alt="CONGRATS YOU HAVE VOTED" src="https://github.com/user-attachments/assets/a9e52e7e-db9f-4e46-9f61-5ecbbed85639" />



5) YOU CAN SEE YOUR VOTE ON BLOCKCHAIN
<img width="902" height="440" alt="YOU CAN SEE YOUR VOTE ON BLOCKCHAIN" src="https://github.com/user-attachments/assets/f1a18bb6-1581-4c5b-baa4-59852fca329d" />

---

## 📋 Features

- ✅ One-question poll with two options (Rust vs JavaScript)
- ✅ Connect Freighter wallet (StellarWalletsKit)
- ✅ Cast a single on-chain vote per wallet address
- ✅ Real-time vote count updates every 5 seconds
- ✅ Transaction status tracking (Pending → Confirmed / Failed)
- ✅ Live explorer link after each vote
- ✅ 3 error types handled gracefully
- ✅ Deployed smart contract on Stellar Testnet

---

## 🔐 Error Handling

| Error | Trigger | Message Shown |
|-------|---------|---------------|
| Wallet Not Found | Freighter not installed | "Freighter wallet not found. Please install it." |
| User Rejected | User dismisses the signing popup | "Transaction rejected by user." |
| Already Voted | Same wallet votes twice | Treated as success — vote was already recorded |

---

## 🧠 Smart Contract

| Detail | Value |
|--------|-------|
| Network | Stellar Testnet |
| Contract ID | `CC35JBDQQVKMA4LJ3ICQSEDC37NXEYV2WGYDQXKZK3GHRHQJT3PUZY7C` |
| Explorer | [View on Stellar Expert ↗](https://stellar.expert/explorer/testnet/contract/CC35JBDQQVKMA4LJ3ICQSEDC37NXEYV2WGYDQXKZK3GHRHQJT3PUZY7C) |

### Contract Functions Called from Frontend

| Function | Type | Description |
|----------|------|-------------|
| `get_poll` | Read | Returns question, option A, option B, and open/closed status |
| `results` | Read | Returns current vote counts for each option |
| `vote` | Write | Casts a vote (0 = Option A, 1 = Option B) |
| `has_voted` | Read | Checks if a wallet address has already voted |

---

## 🛠️ Tech Stack

- **Frontend**: React + Vite
- **Blockchain**: Stellar Testnet (Soroban)
- **Smart Contract**: Rust (compiled to WASM)
- **Wallet**: Freighter via StellarWalletsKit
- **SDK**: `@stellar/stellar-sdk`

---

## ⚙️ Setup & Installation

### Prerequisites

- Node.js 18+
- [Freighter Wallet](https://www.freighter.app/) browser extension
- Freighter set to **Testnet**

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/live-poll.git
cd live-poll
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Create a `.env` file in the root:

```dotenv
VITE_CONTRACT_ID=CC35JBDQQVKMA4LJ3ICQSEDC37NXEYV2WGYDQXKZK3GHRHQJT3PUZY7C
VITE_PLACEHOLDER_KEY=YOUR_DEPLOYER_PUBLIC_KEY
```

To get your deployer public key:
```bash
stellar keys address deployer
```

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🗂️ Project Structure

```
src/
├── App.jsx               # Main UI component
├── hooks/
│   ├── useWallet.js      # Wallet connection, signing, error handling
│   └── usePoll.js        # Poll state, voting, tx tracking, live polling
├── lib/
│   └── stellar.js        # Soroban RPC helpers, contract calls
└── index.css             # Styles
```

---

## 🔄 How It Works

1. User connects Freighter wallet
2. App reads poll data from the smart contract (`get_poll`, `results`)
3. User clicks **Cast Vote** — a Soroban transaction is built, signed by Freighter, and submitted to testnet
4. App polls `results` every 5 seconds and updates the UI live
5. After voting, the wallet is permanently recorded on-chain — no double voting possible

---

## 📦 Deploying the Contract

```bash
# Build
cargo build --target wasm32-unknown-unknown --release

# Deploy
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/live_poll.wasm \
  --source deployer \
  --network testnet

# Initialize
stellar contract invoke \
  --id YOUR_CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- init \
  --question "What is your favourite programming language?" \
  --option_a "Rust" \
  --option_b "JavaScript"
```

---

## 📡 Verify on-chain

```bash
# Check current results
stellar contract invoke \
  --id CC35JBDQQVKMA4LJ3ICQSEDC37NXEYV2WGYDQXKZK3GHRHQJT3PUZY7C \
  --source deployer \
  --network testnet \
  -- results
```

---

## 📝 Level 2 Checklist

- [x] 3 error types handled (not found, rejected, already voted)
- [x] Contract deployed on Stellar Testnet
- [x] Contract called from the frontend (read + write)
- [x] Transaction status visible (pending / confirmed / failed)
- [x] Minimum 2+ meaningful commits
- [x] Real-time event synchronization (polling every 5s)
- [x] Multi-wallet support via StellarWalletsKit
