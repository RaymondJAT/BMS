import { apiClient } from './axios'

/**
 * ASSUMPTION — temporary mock placeholder pending actual master-access controller.
 * Maps role ID to access names: { id, name }
 */
export const masterAccessApi = {
  getAll: async () => {
    try {
      const response = await apiClient.get('/master-access')
      return response.data || []
    } catch {
      // Fallback mock roles map until backend endpoint is built
      return [
        { id: 1, name: 'Super Admin' },
        { id: 2, name: 'Disbursement Encoder' },
        { id: 3, name: 'Finance Approver' },
      ]
    }
  },
}

export default masterAccessApi
