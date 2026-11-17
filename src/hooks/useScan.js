import { useEffect, useState } from 'react'
import { getScan } from '../services/scanApi.js'

/** Loads a scan; with { poll: true } keeps refreshing every second until the scan stops running. */
export function useScan(scanId, { poll = false } = {}) {
  const [scan, setScan] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let stopped = false
    let timer
    async function load() {
      try {
        const next = await getScan(scanId)
        if (stopped) return
        setScan(next)
        setError(null)
        setLoading(false)
        if (poll && next.status === 'running') timer = setTimeout(load, 1000)
      } catch (e) {
        if (stopped) return
        setError(e)
        setLoading(false)
      }
    }
    setLoading(true)
    load()
    return () => {
      stopped = true
      clearTimeout(timer)
    }
  }, [scanId, poll])

  return { scan, error, loading }
}
