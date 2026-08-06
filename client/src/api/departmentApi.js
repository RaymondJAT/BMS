import { apiClient } from './axios'

const departmentApi = {
  // Fetch department master records
  getAll: async () => {
    const response = await apiClient.get('/master-department')
    return response.data || []
  },
}

export default departmentApi
