import { useState, useCallback } from 'react'
import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  FREIGHTER_ID,
  LOBSTR_ID,
  XBULL_ID,
} from '@creit.tech/stellar-wallets-kit'

//  Error classification 
export const WalletErrorType = {
  NOT_FOUND:           'NOT_FOUND',       // Extension not installed
  REJECTED:            'REJECTED',        // User denied connection/signing
  INSUFFICIENT_FUNDS:  'INSUFFICIENT_FUNDS',
  NETWORK_ERROR:       'NETWORK_ERROR',
  UNKNOWN:             'UNKNOWN',
}

function classifyError(err) {
  const msg = (err?.message || err?.toString() || '').toLowerCase()

  if (
    msg.includes('not found') ||
    msg.includes('not installed') ||
    msg.includes('freighter is not defined') ||
    msg.includes('is not installed') ||
    err?.code === -3
  ) return WalletErrorType.NOT_FOUND

  if (
    msg.includes('rejected') ||
    msg.includes('declined') ||
    msg.includes('cancel') ||
    msg.includes('user denied') ||
    err?.code === 4001
  ) return WalletErrorType.REJECTED

  if (
    msg.includes('insufficient') ||
    msg.includes('not enough') ||
    msg.includes('balance')
  ) return WalletErrorType.INSUFFICIENT_FUNDS

  if (
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('fetch')
  ) return WalletErrorType.NETWORK_ERROR

  return WalletErrorType.UNKNOWN
}

// Error messages for the UI 
export const ERROR_MESSAGES = {
  [WalletErrorType.NOT_FOUND]:
    'Wallet extension not found. Please install Freighter, LOBSTR, or xBull.',
  [WalletErrorType.REJECTED]:
    'You rejected the request. Click again when ready.',
  [WalletErrorType.INSUFFICIENT_FUNDS]:
    'Insufficient XLM balance. Fund your testnet account at friendbot.stellar.org',
  [WalletErrorType.NETWORK_ERROR]:
    'Network error. Check your connection and try again.',
  [WalletErrorType.UNKNOWN]:
    'An unexpected error occurred. Please try again.',
}

// Singleton kit 
let _kit = null
function getKit() {
  if (!_kit) {
    _kit = new StellarWalletsKit({
      network: WalletNetwork.TESTNET,
      selectedWalletId: FREIGHTER_ID,
      modules: allowAllModules(),
    })
  }
  return _kit
}

export function useWallet() {
  const [address,  setAddress]  = useState(null)
  const [walletId, setWalletId] = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null) // { type, message }

  const clearError = useCallback(() => setError(null), [])

  // Connect via modal 
  const connect = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const kit = getKit()

      await kit.openModal({
        onWalletSelected: async (option) => {
          try {
            kit.setWallet(option.id)
            const { address: addr } = await kit.getAddress()
            setAddress(addr)
            setWalletId(option.id)
          } catch (err) {
            const type = classifyError(err)
            setError({ type, message: ERROR_MESSAGES[type] })
          }
        },
      })
    } catch (err) {
      const type = classifyError(err)
      setError({ type, message: ERROR_MESSAGES[type] })
    } finally {
      setLoading(false)
    }
  }, [])

  //  Sign a transaction 
  const signTx = useCallback(async (tx) => {
    if (!address) throw new Error('Not connected')
    setLoading(true)
    setError(null)
    try {
      const kit = getKit()
      const { signedTxXdr } = await kit.signTransaction(tx.toXDR(), {
        address,
        networkPassphrase: 'Test SDF Network ; September 2015',
      })
      return signedTxXdr
    } catch (err) {
      const type = classifyError(err)
      const walletError = { type, message: ERROR_MESSAGES[type] }
      setError(walletError)
      throw walletError
    } finally {
      setLoading(false)
    }
  }, [address])

  // Disconnect 
  const disconnect = useCallback(() => {
    setAddress(null)
    setWalletId(null)
    setError(null)
  }, [])

  return {
    address, walletId, loading, error,
    connect, signTx, disconnect, clearError,
    isConnected: !!address,
  }
}
