import { apiClient } from './axios'

export const masterProjectApi = {
  // Get all projects. Pass { status: 'ACTIVE' } to filter — used by the
  // Cash Request "Project" dropdown to only show active ones.
  getAll: async (params = {}) => {
    const response = await apiClient.get('/master-project', { params })
    return response.data || []
  },

  // Create or update a Project. Include `id` to update, omit to create.
  upsert: async (payload) => {
    const response = await apiClient.post('/master-project', payload)
    return response.data
  },
}

export default masterProjectApi
