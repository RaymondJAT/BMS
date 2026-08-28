import { apiClient } from './axios'

export const syncApi = {
  // Pulls departments, positions, employees, and user accounts from
  // HRMIS and upserts anything not already present locally. Returns a
  // summary of what was added/skipped per entity.
  run: async (token) => {
    const response = await apiClient.post('/synchronize/run', { token })
    return response.data
  },
}

export default syncApi
