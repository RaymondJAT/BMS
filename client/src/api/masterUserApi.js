import { apiClient } from './axios'

/**
 * Confirmed response shape (master-user.controller.js getMasterUser):
 *   { id, user_id, username, status, employee_id, access_id,
 *     access_name, fullname, createdAt }
 *
 * `id` and `user_id` are the same value (kept for compatibility with
 * either key). `fullname` is the linked employee's name, pre-joined.
 * `access_name` is the linked role's name, pre-joined.
 */
export const masterUserApi = {
  getAll: async () => {
    const response = await apiClient.get('/master-user')
    return response.data || []
  },

  /**
   * Insert or update a user record
   * Endpoint: POST /master-user
   * @param {Object} payload - { id (optional), employee_id, username,
   *   password, access, status }
   */
  upsert: async (payload) => {
    const response = await apiClient.post('/master-user', payload)
    return response.data
  },
}

export default masterUserApi
