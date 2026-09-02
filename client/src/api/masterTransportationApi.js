import { apiClient } from './axios'

export const masterTransportationApi = {
  getAll: async () => {
    const response = await apiClient.get('/master-mode-of-transportation')
    return response.data?.data || response.data || []
  },

  upsert: async ({ id, name, status }) => {
    const params = new URLSearchParams()
    if (id) params.append('id', id)
    if (name !== undefined) params.append('name', name)
    if (status !== undefined) params.append('status', status)

    const response = await apiClient.post('/master-mode-of-transportation', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
    return response.data
  },

  importCSV: async (items) => {
    const response = await apiClient.post('/master-mode-of-transportation/import', { items })
    return response.data
  },
}

export default masterTransportationApi
