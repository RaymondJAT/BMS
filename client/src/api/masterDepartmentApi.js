import { apiClient } from './axios'

export const masterDepartmentApi = {
  // Get all departments — confirmed shape: { id, code, name, status, createdAt }
  getAll: async () => {
    const response = await apiClient.get('/master-department')
    return response.data || []
  },
}

export default masterDepartmentApi
