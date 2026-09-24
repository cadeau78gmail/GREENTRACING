import { useEffect, useState } from 'react'

export const API_BASE = '/api'

export async function patchApi(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

/**
 * Fetches `${API_BASE}${path}` and re-fetches every `intervalMs` (default
 * 10s) to keep the "LIVE" feel. Returns { data, loading, error }.
 *
 * `data` keeps its *previous* value while a refresh is in flight, so the
 * page doesn't flash empty on every poll — only on the very first load.
 */
export function useApiData(path, intervalMs = 10000) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true

    async function load() {
      try {
        const res = await fetch(`${API_BASE}${path}`)
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
        const json = await res.json()
        if (alive) {
          setData(json)
          setError(null)
        }
      } catch (err) {
        if (alive) setError(err)
      } finally {
        if (alive) setLoading(false)
      }
    }

    load()
    const id = setInterval(load, intervalMs)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [path, intervalMs])

  return { data, loading, error }
}
