import { apiClient } from './axios'

export const masterDistrictApi = {
  getAll: async () => {
    const response = await apiClient.get('/master-district')
    return response.data || []
  },

  upsert: async ({ id, store_number, store_name, region, city_province, status }) => {
    const params = new URLSearchParams()
    if (id) params.append('id', id)
    if (store_number !== undefined) params.append('store_number', store_number)
    if (store_name !== undefined) params.append('store_name', store_name)
    if (region !== undefined) params.append('region', region)
    if (city_province !== undefined) params.append('city_province', city_province)
    if (status !== undefined) params.append('status', status)

    const response = await apiClient.post('/master-district', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
    return response.data
  },

  importCSV: async (items) => {
    const response = await apiClient.post('/master-district/import', items, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    return response.data
  },
}

export default masterDistrictApi
