// src/App.jsx
import { useState } from 'react'
import { useWallet, ERROR_MESSAGES, WalletErrorType } from './hooks/useWallet'
import { usePoll, TxStatus } from './hooks/usePoll'
import './index.css'

// ── Helpers ───────────────────────────────────────────────────────────────────
function shortAddr(addr) {
  if (!addr) return ''
  return addr.slice(0, 4) + '…' + addr.slice(-4)
}

function pct(a, b) {
  const total = a + b
  if (total === 0) return [50, 50]
  return [Math.round((a / total) * 100), Math.round((b / total) * 100)]
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TxBadge({ txStatus }) {
  if (txStatus.status === TxStatus.IDLE) return null
  const map = {
    [TxStatus.PENDING]: { label: 'Broadcasting…', cls: 'tx-pending' },
    [TxStatus.SUCCESS]: { label: '✓ Confirmed',   cls: 'tx-success' },
    [TxStatus.FAILED]:  { label: '✗ Failed',       cls: 'tx-failed'  },
  }
  const { label, cls } = map[txStatus.status]
  return (
    <div className={`tx-badge ${cls}`}>
      <span className="tx-dot" />
      {label}
      {txStatus.hash && (
        <a
          href={`https://stellar.expert/explorer/testnet/tx/${txStatus.hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="tx-link"
        >
          view ↗
        </a>
      )}
    </div>
  )
}

function ErrorBanner({ error, onDismiss }) {
  if (!error) return null
  const icon = {
    [WalletErrorType.NOT_FOUND]:          '🔌',
    [WalletErrorType.REJECTED]:           '🚫',
    [WalletErrorType.INSUFFICIENT_FUNDS]: '💸',
    [WalletErrorType.NETWORK_ERROR]:      '📡',
    [WalletErrorType.UNKNOWN]:            '⚠️',
  }[error.type] || '⚠️'

  return (
    <div className="error-banner">
      <span className="error-icon">{icon}</span>
      <span>{error.message}</span>
      <button onClick={onDismiss} className="error-dismiss">×</button>
    </div>
  )
}

function VoteBar({ label, votes, pctVal, option, onVote, disabled, winner }) {
  return (
    <div className={`vote-card ${winner ? 'vote-card--winner' : ''}`}>
      <div className="vote-card-top">
        <span className="vote-label">{label}</span>
        <span className="vote-count">{votes} <span className="vote-count-unit">votes</span></span>
      </div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${pctVal}%` }} />
      </div>
      <div className="vote-card-bottom">
        <span className="pct-display">{pctVal}%</span>
        {!disabled && (
          <button className="vote-btn" onClick={() => onVote(option)}>
            Cast Vote
          </button>
        )}
        {winner && <span className="winner-tag">Leading</span>}
      </div>
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const { address, loading: walletLoading, error: walletError, connect, signTx, disconnect, clearError, isConnected } = useWallet()
  const { poll, hasVoted, txStatus, loading: pollLoading, voteError, newVoteFlash, vote } = usePoll(address, signTx)

  const total  = (poll?.votesA ?? 0) + (poll?.votesB ?? 0)
  const [pA, pB] = pct(poll?.votesA ?? 0, poll?.votesB ?? 0)
  const voteDisabled = !isConnected || hasVoted || !poll?.isOpen || txStatus.status === TxStatus.PENDING

  return (
    <div className="app">
      {/* Grid noise overlay */}
      <div className="bg-grid" aria-hidden />
      <div className="bg-glow" aria-hidden />

      <header className="header">
        <div className="logo">
          <span className="logo-dot" />
          <span className="logo-text">LivePoll</span>
          <span className="logo-badge">TESTNET</span>
        </div>

        <div className="header-right">
          {newVoteFlash && <span className="live-pulse">● LIVE</span>}
          {isConnected ? (
            <div className="wallet-chip">
              <span className="wallet-addr">{shortAddr(address)}</span>
              <button className="wallet-disconnect" onClick={disconnect}>✕</button>
            </div>
          ) : (
            <button className="btn-connect" onClick={connect} disabled={walletLoading}>
              {walletLoading ? 'Connecting…' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </header>

      <main className="main">
        {/* Error banners */}
        <ErrorBanner error={walletError} onDismiss={clearError} />
        {voteError && (
          <div className="error-banner">
            <span className="error-icon">⚠️</span>
            <span>{voteError}</span>
          </div>
        )}

        {/* Tx status */}
        <TxBadge txStatus={txStatus} />

        {/* Poll card */}
        <section className="poll-card">
          <div className="poll-header">
            <div className="poll-status">
              <span className={`status-dot ${poll?.isOpen ? 'status-dot--open' : 'status-dot--closed'}`} />
              <span>{poll?.isOpen ? 'Poll Open' : 'Poll Closed'}</span>
            </div>
            <div className="total-votes">{total} total votes</div>
          </div>

          <h1 className="question">
            {pollLoading ? '—' : poll?.question ?? 'Loading poll…'}
          </h1>

          {/* Voting options */}
          <div className="options">
            <VoteBar
              label={poll?.optionA ?? '…'}
              votes={poll?.votesA ?? 0}
              pctVal={pA}
              option={0}
              onVote={vote}
              disabled={voteDisabled}
              winner={pA > pB && total > 0}
            />
            <div className="vs-divider">vs</div>
            <VoteBar
              label={poll?.optionB ?? '…'}
              votes={poll?.votesB ?? 0}
              pctVal={pB}
              option={1}
              onVote={vote}
              disabled={voteDisabled}
              winner={pB > pA && total > 0}
            />
          </div>

          {/* State messaging */}
          <div className="status-msg">
            {!isConnected && (
              <p>Connect a wallet to vote · Results update live every 5 seconds</p>
            )}
            {isConnected && hasVoted && (
              <p>✓ Your vote has been recorded on-chain. Results refresh automatically.</p>
            )}
            {isConnected && !hasVoted && poll?.isOpen && (
              <p>Choose an option above to cast your on-chain vote.</p>
            )}
            {isConnected && !poll?.isOpen && (
              <p>This poll has closed. Final results are shown above.</p>
            )}
          </div>
        </section>

        {/* Contract info footer */}
        <footer className="footer">
          <div className="footer-row">
            <span className="footer-label">Contract</span>
            <a
              href={`https://stellar.expert/explorer/testnet/contract/${import.meta.env.VITE_CONTRACT_ID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="footer-link"
            >
              {import.meta.env.VITE_CONTRACT_ID
                ? shortAddr(import.meta.env.VITE_CONTRACT_ID)
                : 'deploy contract first'}
              ↗
            </a>
          </div>
          <div className="footer-row">
            <span className="footer-label">Network</span>
            <span>Stellar Testnet</span>
          </div>
          <div className="footer-row">
            <span className="footer-label">Events</span>
            <span>Polling every 5s</span>
          </div>
        </footer>
      </main>
    </div>
  )
}