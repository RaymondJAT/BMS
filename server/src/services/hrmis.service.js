/**
 * All direct communication with the external HRMIS API lives here —
 * the controller never calls fetch() itself.
 *
 * HRMIS_TOKEN_URL is a fixed, permanent endpoint — it never changes and
 * needs no credentials in the request. Calling it returns a FRESH,
 * short-lived bearer token every time (confirmed: tokens expire fast
 * enough that manually copy-pasting one from Postman into a UI field
 * routinely arrived already expired). So instead of accepting a
 * human-pasted token, we fetch one ourselves immediately before using
 * it — same request, no gap for it to go stale in.
 */

const HRMIS_TOKEN_URL = 'https://hrmis.5lsolutions.com/sync/get-token'
const HRMIS_BASE = 'https://hrmis.5lsolutions.com/hrmis'

const normalizeName = (str) =>
  str
    ?.replace(/department$/i, '')
    ?.replace(/[^a-zA-Z0-9]/g, '')
    ?.toLowerCase()
    ?.trim()

/**
 * Requests a fresh token from HRMIS's permanent token endpoint. Called
 * once per sync run, immediately before the data fetches, so the token
 * is as fresh as possible when it's actually used.
 */
const requestFreshToken = async ({ debug = false } = {}) => {
  const res = await fetch(HRMIS_TOKEN_URL)
  if (!res.ok) {
    const bodyText = await res.text().catch(() => '<unreadable body>')
    throw new Error(
      `Failed to obtain HRMIS token: ${res.status} ${res.statusText} — ${bodyText.slice(0, 200)}`,
    )
  }
  const json = await res.json()
  const token = json?.data
  if (!token || typeof token !== 'string') {
    throw new Error(
      `HRMIS token endpoint returned an unexpected shape: ${JSON.stringify(json).slice(0, 200)}`,
    )
  }
  if (debug) {
    console.log(
      `[hrmis] obtained fresh token (length: ${token.length}, ends: ...${token.slice(-6)})`,
    )
  }
  return token
}

const fetchHrmisEndpoint = async (path, token, { base = HRMIS_BASE, debug = false } = {}) => {
  const url = `${base}/${path}`

  if (debug) {
    console.log(`[hrmis] -> GET ${url}`)
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })

  if (!res.ok) {
    const bodyText = await res.text().catch(() => '<unreadable body>')
    if (debug) {
      console.log(
        `[hrmis] <- ${res.status} ${res.statusText} for ${path}: ${bodyText.slice(0, 300)}`,
      )
    }
    throw new Error(
      `HRMIS request failed for ${path}: ${res.status} ${res.statusText} — ${bodyText.slice(0, 200)}`,
    )
  }

  const json = await res.json()
  if (debug) {
    console.log(`[hrmis] ${path} ->`, JSON.stringify(json).slice(0, 500))
  }
  return json
}

/**
 * Gets a fresh token, then pulls all four HRMIS collections in
 * parallel using it. Never rejects as a whole — a failing endpoint is
 * reported per-endpoint in `errors` and its data defaults to an empty
 * list, so a partial HRMIS outage doesn't block the rest of the sync.
 * Only the token step itself is fatal (nothing can proceed without it).
 */
const fetchAllHrmisData = async ({ debug = false } = {}) => {
  const token = await requestFreshToken({ debug })

  const endpoints = ['get-department', 'get-position', 'get-employee', 'get-users']

  const results = await Promise.allSettled(
    endpoints.map((path) => fetchHrmisEndpoint(path, token, { debug })),
  )

  const errors = []
  const data = {}

  results.forEach((result, i) => {
    const path = endpoints[i]
    if (result.status === 'fulfilled') {
      data[path] = result.value?.data || []
    } else {
      errors.push({ endpoint: path, reason: result.reason?.message || String(result.reason) })
      data[path] = []
    }
  })

  return {
    departments: data['get-department'],
    positions: data['get-position'],
    employees: data['get-employee'],
    users: data['get-users'],
    errors,
  }
}

module.exports = { normalizeName, fetchAllHrmisData }
