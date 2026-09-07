const { Query, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Master } = require('../database/models/Master')
const SQL = new SQLQueryBuilder()

// TODO(route-protection): once real enforcement/middleware exists, this
// should be the single place both the API and the middleware check for
// "this role always has full access". For now it only protects the admin
// UI itself from producing a locked-out state.
const PROTECTED_ACCESS_NAMES = ['ADMINISTRATOR']

const isProtectedAccessName = (name) => PROTECTED_ACCESS_NAMES.includes((name || '').toUpperCase())

const getAccessName = async (accessId) => {
  const rows = await Query(
    `SELECT ${Master.Access.cols.name} AS name FROM ${Master.Access.table} WHERE ${Master.Access.pk} = ?`,
    [accessId],
  )
  return rows?.[0]?.name || null
}

/**
 * @name getRouteCatalog
 * @description Every distinct route name belonging to an ACTIVE route
 *              entry, across all roles. Stand-in for a real route catalog
 *              until a dedicated master_route table exists. Only ACTIVE
 *              routes are eligible to appear in a role's permission
 *              editor — setting a route to INACTIVE here retires it from
 *              that editor entirely.
 */
const getRouteCatalog = async (req, res) => {
  // #swagger.tags = ['Master Route Access']
  // #swagger.description = 'Get the distinct list of ACTIVE route names known to the permission system. Used to populate the route permission editor.'

  try {
    const rows = await Query(
      `SELECT DISTINCT ${Master.RouteAccess.cols.name} AS name
       FROM ${Master.RouteAccess.table}
       WHERE ${Master.RouteAccess.cols.name} IS NOT NULL
         AND ${Master.RouteAccess.cols.status} = 'ACTIVE'
       ORDER BY ${Master.RouteAccess.cols.name} ASC`,
    )
    return res.status(200).json(rows.map((r) => r.name))
  } catch (error) {
    console.error('Error in getRouteCatalog:', error)
    return res.status(500).json({ message: 'Error retrieving route catalog' })
  }
}

/**
 * @name getMasterRouteAccess
 * @description No ?access_id: EVERY row regardless of status — this
 *              powers the flat Route Access admin list page, which needs
 *              to show and let the admin toggle both ACTIVE and INACTIVE
 *              entries.
 *              With ?access_id=X: that role's FULL-ACCESS/NO-ACCESS
 *              permission for every ACTIVE route in the catalog,
 *              defaulting missing rows to NO-ACCESS — an INACTIVE route
 *              never appears here, since it's excluded from the catalog.
 *              Protected roles (see PROTECTED_ACCESS_NAMES) always come
 *              back FULL-ACCESS regardless of what's stored.
 */
const getMasterRouteAccess = async (req, res) => {
  // #swagger.tags = ['Master Route Access']
  // #swagger.description = 'Without access_id: all route access entries regardless of status, for the flat admin list page. With access_id: that role\'s FULL-ACCESS/NO-ACCESS permission for every ACTIVE route, merged and defaulted.'
  /*
    #swagger.parameters['access_id'] = { in: 'query', type: 'integer', required: false, description: 'When provided, returns this access role\'s permission for every ACTIVE route instead of the raw table' }
  */

  const { access_id } = req.query

  try {
    if (!access_id) {
      const { sql, bindings } = SQL.model(Master.RouteAccess)
        .select([
          Master.RouteAccess.cols.id,
          Master.RouteAccess.cols.access_id,
          Master.RouteAccess.cols.name,
          Master.RouteAccess.cols.permission,
          Master.RouteAccess.cols.status,
          Master.RouteAccess.cols.createdAt,
        ])
        .build()

      const result = await Query(sql, bindings)
      return res.status(200).json(result)
    }

    const accessName = await getAccessName(access_id)
    const isProtected = isProtectedAccessName(accessName)

    const catalogRows = await Query(
      `SELECT DISTINCT ${Master.RouteAccess.cols.name} AS name
       FROM ${Master.RouteAccess.table}
       WHERE ${Master.RouteAccess.cols.name} IS NOT NULL
         AND ${Master.RouteAccess.cols.status} = 'ACTIVE'
       ORDER BY ${Master.RouteAccess.cols.name} ASC`,
    )

    const existingRows = await Query(
      `SELECT ${Master.RouteAccess.pk} AS id,
              ${Master.RouteAccess.cols.name} AS name,
              ${Master.RouteAccess.cols.permission} AS permission,
              ${Master.RouteAccess.cols.status} AS status
       FROM ${Master.RouteAccess.table}
       WHERE ${Master.RouteAccess.cols.access_id} = ?
         AND ${Master.RouteAccess.cols.status} = 'ACTIVE'`,
      [access_id],
    )
    const existingByName = new Map(existingRows.map((row) => [row.name, row]))

    const merged = catalogRows.map(({ name }) => {
      const existing = existingByName.get(name)
      return {
        id: existing?.id || null,
        access_id: Number(access_id),
        name,
        permission: isProtected ? 'FULL-ACCESS' : existing?.permission || 'NO-ACCESS',
        status: existing?.status || 'ACTIVE',
      }
    })

    return res.status(200).json(merged)
  } catch (error) {
    console.error('Error in getMasterRouteAccess:', error)
    return res.status(500).json({ message: 'Error retrieving RouteAccess records' })
  }
}

/**
 * @name upsertMasterRouteAccess
 * @description Two independent things can be set on a row: `permission`
 *              (FULL-ACCESS/NO-ACCESS — set per role via the Access page's
 *              permission editor; controls whether that role can see the
 *              route at all) and `status` (ACTIVE/INACTIVE — set via the
 *              flat Route Access page; an INACTIVE route disappears from
 *              every role's permission editor entirely). A caller only
 *              needs to send the field(s) it's actually changing.
 *              Protected roles (Administrator) can't be set to NO-ACCESS
 *              permission through this endpoint.
 */
const upsertMasterRouteAccess = async (req, res) => {
  // #swagger.tags = ['Master Route Access']
  // #swagger.description = 'Create or update a single route access entry. Set `permission` to control a role\'s FULL-ACCESS/NO-ACCESS to that route, or `status` to enable/disable the route entry itself (ACTIVE/INACTIVE).'
  // #swagger.autoBody = false
  // #swagger.consumes = ['application/x-www-form-urlencoded', 'application/json']
  /*
    #swagger.parameters['id'] = { in: 'formData', type: 'integer', required: false, description: 'Existing route access row id — omit when creating a new (access_id, name) pair' }
    #swagger.parameters['access_id'] = { in: 'formData', type: 'integer', required: false, description: 'Access role id (master_access.ma_id) — required when id is not provided' }
    #swagger.parameters['name'] = { in: 'formData', type: 'string', required: false, description: 'Route name — required when id is not provided' }
    #swagger.parameters['permission'] = { in: 'formData', type: 'string', required: false, description: 'FULL-ACCESS or NO-ACCESS' }
    #swagger.parameters['status'] = { in: 'formData', type: 'string', required: false, description: 'ACTIVE or INACTIVE' }
  */

  const { id, access_id, name, permission, status } = req.body
  const userId = req.user?.id || req.userId || null

  try {
    let targetId = id
    let resolvedAccessId = access_id
    let resolvedName = name

    if (targetId) {
      // Editing an existing row. access_id/name are ONLY needed below for
      // the protected-role guard, and that guard only fires when
      // `permission` is actually being changed — a pure status toggle
      // (the flat Route Access page's only use of this endpoint) never
      // sends `permission`, so it must not be blocked just because this
      // row's access_id/name couldn't be resolved. Best-effort lookup
      // only; a resolution gap here is fatal only if `permission` is set.
      if (!resolvedAccessId || !resolvedName) {
        const rows = await Query(
          `SELECT ${Master.RouteAccess.cols.access_id} AS access_id, ${Master.RouteAccess.cols.name} AS name
           FROM ${Master.RouteAccess.table} WHERE ${Master.RouteAccess.pk} = ?`,
          [targetId],
        )
        if (!rows?.[0]) {
          return res.status(404).json({ message: 'RouteAccess not found' })
        }
        // ?? not || — a legitimate access_id of 0 must not be treated as
        // missing the way `resolvedAccessId || rows[0].access_id` would.
        resolvedAccessId = resolvedAccessId ?? rows[0].access_id
        resolvedName = resolvedName ?? rows[0].name
      }
    } else {
      // Creating a brand-new row — access_id and name are genuinely
      // mandatory here; there's no row to fall back on.
      if (!resolvedAccessId || !resolvedName) {
        return res.status(400).json({ message: 'access_id and name are required' })
      }
    }

    // Protected-role guard: only relevant when permission is actually
    // being set. Skips cleanly (rather than erroring) when access_id
    // couldn't be resolved for a status-only update, since that path
    // never reaches here needing it.
    if (permission !== undefined && resolvedAccessId) {
      const accessName = await getAccessName(resolvedAccessId)
      if (isProtectedAccessName(accessName) && permission === 'NO-ACCESS') {
        return res.status(400).json({
          message: `${accessName} must always retain FULL-ACCESS and cannot be set to NO-ACCESS.`,
        })
      }
    }

    if (!targetId) {
      const existing = await Query(
        `SELECT ${Master.RouteAccess.pk} AS id FROM ${Master.RouteAccess.table}
         WHERE ${Master.RouteAccess.cols.access_id} = ? AND ${Master.RouteAccess.cols.name} = ?
         LIMIT 1`,
        [resolvedAccessId, resolvedName],
      )
      targetId = existing?.[0]?.id || null
    }

    let query
    if (targetId) {
      const updateData = {}
      if (permission !== undefined) updateData[Master.RouteAccess.cols.permission] = permission
      if (status !== undefined) updateData[Master.RouteAccess.cols.status] = status
      if (Master.RouteAccess.cols.updatedAt)
        updateData[Master.RouteAccess.cols.updatedAt] = new Date()
      if (Master.RouteAccess.cols.updatedBy) updateData[Master.RouteAccess.cols.updatedBy] = userId

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No data to update' })
      }

      query = SQL.model(Master.RouteAccess)
        .update(updateData)
        .where(Master.RouteAccess.pk, targetId)
        .build()
    } else {
      query = SQL.model(Master.RouteAccess)
        .insert({
          [Master.RouteAccess.cols.access_id]: resolvedAccessId,
          [Master.RouteAccess.cols.name]: resolvedName,
          [Master.RouteAccess.cols.permission]: permission || 'NO-ACCESS',
          [Master.RouteAccess.cols.status]: status || 'ACTIVE',
          ...(Master.RouteAccess.cols.createdBy
            ? { [Master.RouteAccess.cols.createdBy]: userId }
            : {}),
          ...(Master.RouteAccess.cols.createdAt
            ? { [Master.RouteAccess.cols.createdAt]: new Date() }
            : {}),
        })
        .build()
    }

    const result = await Query(query.sql, query.bindings)

    if (targetId && result.affectedRows === 0) {
      return res.status(404).json({ message: 'RouteAccess not found' })
    }

    return res.status(200).json({
      message: targetId ? 'Updated successfully' : 'Created successfully',
      id: targetId || result.insertId,
    })
  } catch (error) {
    console.error('Error in upsertMasterRouteAccess:', error)
    return res.status(500).json({ message: 'Error processing RouteAccess' })
  }
}

module.exports = {
  getRouteCatalog,
  getMasterRouteAccess,
  upsertMasterRouteAccess,
}
