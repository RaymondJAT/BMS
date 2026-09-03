import { useState, useEffect, useMemo } from 'react'
import { Modal } from '../../ui/Modal'
import { Search, Loader2, Check, ShieldAlert } from 'lucide-react'
import { routeAccessApi } from '../../../api/routeAccessApi'

export default function EditPermissionModal({ isOpen, onClose, accessData, onRoutesUpdated }) {
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [selectedKeys, setSelectedKeys] = useState([])
  const [errorMessage, setErrorMessage] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  const accessId = accessData?.ma_id || accessData?.id
  const roleName =
    accessData?.ma_name || accessData?.accessName || accessData?.name || 'Access Role'
  const isProtectedRole = String(roleName).toUpperCase() === 'ADMINISTRATOR'

  useEffect(() => {
    if (isOpen && accessId) {
      fetchPermissions(accessId)
      setSelectedKeys([])
      setSearchText('')
      setErrorMessage(null)
      setSuccessMessage(null)
    }
  }, [isOpen, accessId])

  const fetchPermissions = async (id) => {
    setLoading(true)
    setErrorMessage(null)
    try {
      // Backend already merges the full route catalog with this role's
      // stored permissions, defaulting anything missing to NO-ACCESS —
      // and forces FULL-ACCESS across the board if this role is protected.
      const merged = await routeAccessApi.getPermissionsForAccess(id)

      const routesWithPermissions = merged.map((row) => ({
        key: row.name, // route name is the stable identifier in this schema
        id: row.id, // existing master_route_access row id, or null if unset
        name: row.name,
        permission: row.status,
        originalPermission: row.status,
      }))

      setRoutes(routesWithPermissions)
    } catch (err) {
      console.error('Error fetching route permissions:', err)
      setErrorMessage('Failed to load routes. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filteredRoutes = useMemo(() => {
    return routes.filter((route) => route.name?.toLowerCase().includes(searchText.toLowerCase()))
  }, [routes, searchText])

  const handlePermissionChange = (routeKey, newPermission) => {
    if (isProtectedRole) return
    setRoutes((prev) =>
      prev.map((r) => (r.key === routeKey ? { ...r, permission: newPermission } : r)),
    )
  }

  const handleSelectAll = (e) => {
    if (isProtectedRole) return
    setSelectedKeys(e.target.checked ? filteredRoutes.map((r) => r.key) : [])
  }

  const handleSelectRow = (routeKey) => {
    if (isProtectedRole) return
    setSelectedKeys((prev) =>
      prev.includes(routeKey) ? prev.filter((k) => k !== routeKey) : [...prev, routeKey],
    )
  }

  const handleBulkChange = (e) => {
    if (isProtectedRole) return
    const newPermission = e.target.value
    if (!newPermission) return

    if (selectedKeys.length === 0) {
      setErrorMessage('Please select at least one route to apply bulk changes.')
      return
    }

    setRoutes((prev) =>
      prev.map((r) => (selectedKeys.includes(r.key) ? { ...r, permission: newPermission } : r)),
    )
    e.target.value = ''
    setErrorMessage(null)
  }

  const changedRoutes = useMemo(() => {
    return routes.filter((r) => r.permission !== r.originalPermission)
  }, [routes])

  const hasUnsavedChanges = changedRoutes.length > 0

  const handleSave = async () => {
    if (isProtectedRole || !hasUnsavedChanges) {
      onClose()
      return
    }

    setSaving(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const updatePromises = changedRoutes.map((route) =>
        routeAccessApi.upsert({
          id: route.id || undefined,
          access_id: accessId,
          name: route.name,
          status: route.permission,
        }),
      )

      await Promise.all(updatePromises)

      setSuccessMessage(`Updated ${changedRoutes.length} permission(s) successfully.`)
      setSelectedKeys([])
      await fetchPermissions(accessId)
      onRoutesUpdated?.()
      onClose()
    } catch (err) {
      console.error('Error saving route permissions:', err)
      setErrorMessage(
        err.response?.data?.message || err.message || 'Failed to update route permissions.',
      )
    } finally {
      setSaving(false)
    }
  }

  const isAllSelected =
    filteredRoutes.length > 0 && filteredRoutes.every((r) => selectedKeys.includes(r.key))

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configure Route Permissions"
      subtitle={`Set page and route access levels for ${roleName}.`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-3 sm:space-y-3.5">
        {isProtectedRole && (
          <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded-lg font-medium flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span>
              {roleName} always retains full access to every route and cannot be edited here.
            </span>
          </div>
        )}

        {errorMessage && (
          <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg font-medium flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* CONTROLS BAR */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search route name..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="w-full sm:w-48 shrink-0">
            <select
              defaultValue=""
              disabled={isProtectedRole || selectedKeys.length === 0}
              onChange={handleBulkChange}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="" disabled>
                Bulk Action ({selectedKeys.length})
              </option>
              <option value="FULL-ACCESS">Set FULL-ACCESS</option>
              <option value="NO-ACCESS">Set NO-ACCESS</option>
            </select>
          </div>
        </div>

        {/* ROUTE TABLE LIST */}
        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            <div className="sticky top-0 bg-slate-50 border-b border-slate-200 px-3 py-2 flex items-center justify-between text-[11px] font-bold text-slate-700 uppercase tracking-wider z-10">
              <div className="flex items-center gap-2.5 flex-1">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  disabled={isProtectedRole}
                  className="rounded border-slate-300 text-[#E31837] focus:ring-[#E31837] cursor-pointer disabled:opacity-50"
                />
                <span>Route Name</span>
              </div>
              <div className="w-36 text-right pr-2">Permission</div>
            </div>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin text-[#E31837]" />
                <span className="text-xs font-medium">Loading route permissions...</span>
              </div>
            ) : filteredRoutes.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs font-medium">
                No matching routes found.
              </div>
            ) : (
              filteredRoutes.map((route) => {
                const isModified = route.permission !== route.originalPermission
                const isSelected = selectedKeys.includes(route.key)

                return (
                  <div
                    key={route.key}
                    className={`px-3 py-2 flex items-center justify-between gap-3 text-xs transition-colors ${
                      isModified
                        ? 'bg-amber-50/60 hover:bg-amber-50'
                        : isSelected
                          ? 'bg-slate-50'
                          : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectRow(route.key)}
                        disabled={isProtectedRole}
                        className="rounded border-slate-300 text-[#E31837] focus:ring-[#E31837] cursor-pointer disabled:opacity-50"
                      />
                      <div className="flex items-center gap-2 min-w-0">
                        <code className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-slate-800 text-[11px] font-semibold truncate">
                          {route.name}
                        </code>
                        {isModified && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase tracking-tight shrink-0">
                            Modified
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="w-36 shrink-0 flex justify-end">
                      <select
                        value={route.permission}
                        onChange={(e) => handlePermissionChange(route.key, e.target.value)}
                        disabled={isProtectedRole}
                        className={`w-full px-2 py-1 border rounded-md text-xs font-semibold cursor-pointer transition-colors focus:outline-none focus:ring-1 focus:ring-[#E31837] disabled:opacity-60 disabled:cursor-not-allowed ${
                          route.permission === 'FULL-ACCESS'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        <option value="FULL-ACCESS">FULL-ACCESS</option>
                        <option value="NO-ACCESS">NO-ACCESS</option>
                      </select>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-0.5">
          <span>
            Showing {filteredRoutes.length} of {routes.length} routes
            {selectedKeys.length > 0 && (
              <strong className="text-slate-800 ml-1">({selectedKeys.length} selected)</strong>
            )}
          </span>
          {hasUnsavedChanges && !isProtectedRole && (
            <span className="font-bold text-amber-600">
              {changedRoutes.length} unsaved change{changedRoutes.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg transition-all cursor-pointer disabled:opacity-50"
          >
            {isProtectedRole ? 'Close' : 'Cancel'}
          </button>
          {!isProtectedRole && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !hasUnsavedChanges}
              className="px-4 py-1.5 bg-[#E31837] hover:bg-[#c4122e] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>
                {saving
                  ? 'Saving...'
                  : `Save Changes ${hasUnsavedChanges ? `(${changedRoutes.length})` : ''}`}
              </span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
