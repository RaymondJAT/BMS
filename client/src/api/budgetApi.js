import { apiClient } from './axios'

export const budgetApi = {
  getAll: async () => {
    const response = await apiClient.get('/budget-budget')
    return response.data || []
  },
  getHistory: async (budgetId) => {
    const response = await apiClient.get('/budget-budget/history', {
      params: { budget_id: budgetId },
    })
    return response.data || []
  },
  save: async (payload) => {
    const response = await apiClient.post('/budget-budget', payload)
    return response.data
  },
  delete: async (id) => {
    const response = await apiClient.delete(`/budget-budget/${id}`)
    return response.data
  },
}

export default budgetApi
