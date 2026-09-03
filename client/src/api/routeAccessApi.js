import { apiClient } from './axios'

export const routeAccessApi = {
  // Raw table, all roles — used by the flat Route Access admin list page.
  getAll: async () => {
    const response = await apiClient.get('/master-routeaccess')
    return response.data || []
  },

  // Every route name currently known to the permission system. Stand-in
  // for a real route catalog until master_route exists.
  getRouteCatalog: async () => {
    const response = await apiClient.get('/master-routeaccess/routes')
    return response.data || []
  },

  // One role's permission for every known route, already merged/defaulted
  // server-side (missing rows come back as NO-ACCESS).
  getPermissionsForAccess: async (accessId) => {
    const response = await apiClient.get('/master-routeaccess', {
      params: { access_id: accessId },
    })
    return response.data || []
  },

  // Insert or update a single (access_id, name) permission
  upsert: async (payload) => {
    const response = await apiClient.post('/master-routeaccess', payload)
    return response.data
  },
}

export default routeAccessApi
