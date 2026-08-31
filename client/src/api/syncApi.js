import { apiClient } from './axios'

export const syncApi = {
  run: async () => {
    const response = await apiClient.post('/synchronize/run')
    return response.data
  },
}

export default syncApi
