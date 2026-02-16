"use client"

import { useEffect } from "react"

const RELOAD_KEY = "chunk-load-reload-count"

/**
 * In Docker dev, first load can hit ChunkLoadError (timeout) while webpack compiles.
 * This component listens for chunk errors and reloads once to recover.
 */
export function ChunkLoadRecovery() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const msg = event.message || ""
      if (msg.includes("ChunkLoadError") || msg.includes("Loading chunk") || msg.includes("timeout")) {
        const count = parseInt(sessionStorage.getItem(RELOAD_KEY) || "0", 10)
        if (count < 1) {
          sessionStorage.setItem(RELOAD_KEY, "1")
          window.location.reload()
        }
      }
    }

    window.addEventListener("error", handleError)
    return () => window.removeEventListener("error", handleError)
  }, [])

  return null
}
