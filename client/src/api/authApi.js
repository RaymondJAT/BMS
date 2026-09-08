import { apiClient } from './axios'

export const authApi = {
  login: async (username, password) => {
    const response = await apiClient.post('/auth/login', { username, password })
    return response.data
  },

  logout: async () => {
    const response = await apiClient.post('/auth/logout')
    return response.data
  },

  // Re-verifies against the database (see checkSession in
  // auth.controller.js) — not just decoding the locally-stored JWT.
  checkSession: async () => {
    const response = await apiClient.get('/auth/me')
    return response.data
  },
}

export default authApi
