// Poll state, voting, real-time sync, tx tracking
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  fetchPollData,
  fetchHasVoted,
  buildVoteTx,
  submitAndWait,
  startEventPolling,
} from '../lib/stellar'

export const TxStatus = {
  IDLE:     'IDLE',
  PENDING:  'PENDING',
  SUCCESS:  'SUCCESS',
  FAILED:   'FAILED',
}

export function usePoll(address, signTx) {
  const [poll, setPoll]             = useState(null)
  const [hasVoted, setHasVoted]     = useState(false)
  const [txStatus, setTxStatus]     = useState({ status: TxStatus.IDLE, hash: null })
  const [loading, setLoading]       = useState(true)
  const [voteError, setVoteError]   = useState(null)
  const [newVoteFlash, setNewVoteFlash] = useState(false)
  const stopPollingRef              = useRef(null)
  const txHashRef                   = useRef(null)

  // Initial data load 
  const refresh = useCallback(async () => {
    try {
      const data = await fetchPollData()
      setPoll(data)
    } catch (e) {
      console.error('fetchPollData failed', e)
    } finally {
      setLoading(false)
    }
  }, [])

  // Check if connected user has voted 
  useEffect(() => {
    if (!address) return
    fetchHasVoted(address).then(setHasVoted)
  }, [address])

  // Start polling for live updates 
  useEffect(() => {
    refresh()

    const stop = startEventPolling((newData) => {
      setPoll(newData)
      setNewVoteFlash(true)
      setTimeout(() => setNewVoteFlash(false), 1500)
    }, 5000)

    stopPollingRef.current = stop
    return () => stop()
  }, [])

  //  Cast a vote 
  const vote = useCallback(async (option) => {
    if (!address || !signTx) return
    setVoteError(null)
    setTxStatus({ status: TxStatus.PENDING, hash: null })
    txHashRef.current = null

    try {
      const tx = await buildVoteTx(address, option)

      const signedXdr = await signTx(tx)

      await submitAndWait(signedXdr, ({ status, hash }) => {
        txHashRef.current = hash
        // Only update to FAILED here — SUCCESS is set below after refresh
        if (status === TxStatus.FAILED) {
          setTxStatus({ status: TxStatus.FAILED, hash })
        } else {
          setTxStatus({ status: TxStatus.PENDING, hash })
        }
      })
      setHasVoted(true)
      setTxStatus({ status: TxStatus.SUCCESS, hash: txHashRef.current })
      await refresh()

    } catch (err) {
      const msg = err?.message || 'Vote failed'

      const isAlreadyVoted =
        msg.includes('Bad union switch') ||
        msg.includes('already voted') ||
        msg.toLowerCase().includes('error(contract, #4)') ||
        msg.includes('union switch: 4')

      if (isAlreadyVoted && txHashRef.current) {
        // Vote actually succeeded — treat as success
        setHasVoted(true)
        setTxStatus({ status: TxStatus.SUCCESS, hash: txHashRef.current })
        await refresh()
        return
      }

      // Genuine failure
      setVoteError(msg)
      setTxStatus({ status: TxStatus.FAILED, hash: txHashRef.current })
    }
  }, [address, signTx, refresh])

  return {
    poll,
    hasVoted,
    txStatus,
    loading,
    voteError,
    newVoteFlash,
    vote,
    refresh,
  }
}
