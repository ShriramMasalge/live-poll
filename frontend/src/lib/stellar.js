// src/lib/stellar.js
// ─────────────────────────────────────────────────────────────────────────────
// Stellar / Soroban helpers — contract calls, event listening, tx tracking
// ─────────────────────────────────────────────────────────────────────────────

import {
  SorobanRpc,
  Contract,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  scValToNative,
  nativeToScVal,
  Address,
  Account,
} from '@stellar/stellar-sdk'

export const NETWORK_PASSPHRASE = Networks.TESTNET
export const RPC_URL = 'https://soroban-testnet.stellar.org'

export const CONTRACT_ID =
  import.meta.env.VITE_CONTRACT_ID ||
  'YOUR_CONTRACT_ID_HERE'

export const rpc = new SorobanRpc.Server(RPC_URL, { allowHttp: false })

// ── Build a Soroban contract invocation transaction ───────────────────────────
export async function buildTx(sourcePublicKey, method, params = []) {
  const account  = await rpc.getAccount(sourcePublicKey)
  const contract = new Contract(CONTRACT_ID)

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...params))
    .setTimeout(30)
    .build()

  const simResult = await rpc.simulateTransaction(tx)

  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation error: ${simResult.error}`)
  }

  return SorobanRpc.assembleTransaction(tx, simResult).build()
}

// ── Submit a signed transaction and wait for confirmation ─────────────────────
export async function submitAndWait(signedXdr, onStatus) {
  const sendResult = await rpc.sendTransaction(
    TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE)
  )

  if (sendResult.status === 'ERROR') {
    throw new Error(`Submit error: ${sendResult.errorResult?.toXDR('base64')}`)
  }

  const hash = sendResult.hash
  onStatus?.({ status: 'PENDING', hash })

  let attempts = 0
  while (attempts < 30) {
    await sleep(2000)
    const result = await rpc.getTransaction(hash)

    if (result.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
      onStatus?.({ status: 'SUCCESS', hash })
      return result
    }
    if (result.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
      onStatus?.({ status: 'FAILED', hash })
      throw new Error('Transaction failed on-chain')
    }

    attempts++
    onStatus?.({ status: 'PENDING', hash, attempt: attempts })
  }

  throw new Error('Transaction timed out')
}

// ── Helper: simulate a read-only contract call ────────────────────────────────
const PLACEHOLDER = import.meta.env.VITE_PLACEHOLDER_KEY

async function readCall(method, args = []) {
  try {
    const contract = new Contract(CONTRACT_ID)

    let acc
    try {
      acc = await rpc.getAccount(PLACEHOLDER)
    } catch {
      acc = new Account(PLACEHOLDER, '0')
    }

    const tx = new TransactionBuilder(acc, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build()

    const sim = await rpc.simulateTransaction(tx)

    if (SorobanRpc.Api.isSimulationError(sim)) {
      console.warn(`readCall(${method}) simulation error:`, sim.error)
      return null
    }

    if (!sim.result?.retval) return null

    return scValToNative(sim.result.retval)
  } catch (e) {
    console.warn(`readCall(${method}) failed:`, e)
    return null
  }
}

// ── Safely extract an array from whatever scValToNative returns ───────────────
function toArray(val) {
  if (val === null || val === undefined) return []
  if (Array.isArray(val)) return val
  if (typeof val === 'object') return Object.values(val)
  return []
}

// ── Read poll metadata ─────────────────────────────────────────────────────────
export async function fetchPollData() {
  const [pollRaw, resultsRaw] = await Promise.all([
    readCall('get_poll'),
    readCall('results'),
  ])

  const pd = toArray(pollRaw)
  const rd = toArray(resultsRaw)

  return {
    question: pd[0] != null ? String(pd[0]) : 'Loading...',
    optionA:  pd[1] != null ? String(pd[1]) : 'Option A',
    optionB:  pd[2] != null ? String(pd[2]) : 'Option B',
    isOpen:   pd[3] != null ? Boolean(pd[3]) : true,
    votesA:   Number(rd[0] ?? 0),
    votesB:   Number(rd[1] ?? 0),
  }
}

// ── Check if address has voted ─────────────────────────────────────────────────
export async function fetchHasVoted(address) {
  const result = await readCall('has_voted', [
    Address.fromString(address).toScVal(),
  ])
  return Boolean(result)
}

// ── Build a vote transaction ───────────────────────────────────────────────────
export async function buildVoteTx(voterPublicKey, option) {
  const voterScVal  = Address.fromString(voterPublicKey).toScVal()
  const optionScVal = nativeToScVal(option, { type: 'u32' })
  return buildTx(voterPublicKey, 'vote', [voterScVal, optionScVal])
}

// ── Utility ───────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ── Event polling ─────────────────────────────────────────────────────────────
export function startEventPolling(onNewVote, intervalMs = 5000) {
  let lastVotesA = -1
  let lastVotesB = -1
  let running    = true

  const poll = async () => {
    if (!running) return
    try {
      const data = await fetchPollData()
      if (data.votesA !== lastVotesA || data.votesB !== lastVotesB) {
        lastVotesA = data.votesA
        lastVotesB = data.votesB
        onNewVote(data)
      }
    } catch {}
    if (running) setTimeout(poll, intervalMs)
  }

  poll()
  return () => { running = false }
}