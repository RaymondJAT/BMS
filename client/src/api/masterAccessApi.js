import { apiClient } from './axios'

export const masterAccessApi = {
  /**
   * Fetch all master access records
   * Endpoint: GET /master-access
   */
  getAll: async () => {
    const response = await apiClient.get('/master-access')
    return response.data || []
  },

  /**
   * Insert or update an access role record
   * Endpoint: POST /master-access
   * @param {Object} payload - { id (optional), name, status }
   */
  upsert: async (payload) => {
    const response = await apiClient.post('/master-access', payload)
    return response.data
  },
}

export default masterAccessApi
