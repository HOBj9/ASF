"use client"

import { useEffect, useRef, useCallback } from "react"

interface UsePollingOptions {
  enabled?: boolean
  interval?: number
  onError?: (error: Error) => void
}

export function usePolling(
  callback: () => Promise<void>,
  options: UsePollingOptions = {}
) {
  const { enabled = true, interval = 5000, onError } = options
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const callbackRef = useRef(callback)

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const startPolling = useCallback(() => {
    if (!enabled) return

    const poll = async () => {
      try {
        await callbackRef.current()
      } catch (error) {
        if (onError) {
          onError(error as Error)
        }
      }
    }

    // Poll immediately
    poll()

    // Then poll at interval
    intervalRef.current = setInterval(poll, interval)
  }, [enabled, interval, onError])

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    if (enabled) {
      startPolling()
    } else {
      stopPolling()
    }

    return () => {
      stopPolling()
    }
  }, [enabled, startPolling, stopPolling])

  return { startPolling, stopPolling }
}

