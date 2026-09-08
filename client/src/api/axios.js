import axios from 'axios'

const TOKEN_KEY = 'bms_token'

export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// withCredentials already sends the session cookie login() sets via
// req.session.jwt, but auth.middleware.js also accepts a Bearer header —
// attach it whenever we have a stored token so auth keeps working even if
// the session store isn't configured in a given environment.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// A 401 from anywhere means the stored session is no longer valid
// (expired, revoked, server restarted). Broadcast it once here instead of
// making every API caller special-case 401 — AuthContext listens for this
// and clears its state.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    }
    return Promise.reject(error)
  },
)

export default apiClient
