import { apiClient } from './axios'

export const routeAccessApi = {
  // Fetch all master route access records
  getAll: async () => {
    const response = await apiClient.get('/master-routeaccess')
    return response.data || []
  },

  // Insert or update route access status
  upsert: async (payload) => {
    const response = await apiClient.post('/master-routeaccess', payload)
    return response.data
  },
}

export default routeAccessApi
