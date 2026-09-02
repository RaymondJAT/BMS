import { apiClient } from './axios'

export const masterParticularsApi = {
  getAll: async () => {
    const response = await apiClient.get('/master-particulars')
    return response.data || []
  },

  upsert: async ({ id, code, name, type, description, status }) => {
    const params = new URLSearchParams()
    if (id) params.append('id', id)
    if (code !== undefined) params.append('code', code)
    if (name !== undefined) params.append('name', name)
    if (type !== undefined) params.append('type', type)
    if (description !== undefined) params.append('description', description)
    if (status !== undefined) params.append('status', status)

    const response = await apiClient.post('/master-particulars', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
    return response.data
  },

  importCSV: async (items) => {
    const response = await apiClient.post('/master-particulars/import', items)
    return response.data
  },
}

export default masterParticularsApi
