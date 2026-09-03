const { Query, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Master } = require('../database/models/Master')
const SQL = new SQLQueryBuilder()

// TODO(route-protection): once real route enforcement/middleware exists,
// this should be the single place both the API and the middleware check
// for "this role always has full access" — for now it only protects the
// admin UI itself from producing a locked-out state.
const PROTECTED_ACCESS_NAMES = ['ADMINISTRATOR']

/**
 * @name getRouteCatalog
 * @description Returns every distinct route name that has ever been
 *              assigned to ANY role. This is a stand-in "route catalog"
 *              until a real master_route table (seeded from the actual
 *              frontend route config) exists — see the access/route
 *              permission discussion. A route only appears here once at
 *              least one role has a row for it, so a brand new frontend
 *              route won't show up in the editor until someone creates
 *              the first permission row for it (e.g. for ADMINISTRATOR).
 */
const getRouteCatalog = async (req, res) => {
  try {
    const rows = await Query(
      `SELECT DISTINCT ${Master.RouteAccess.cols.name} AS name
       FROM ${Master.RouteAccess.table}
       WHERE ${Master.RouteAccess.cols.name} IS NOT NULL
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
 * @description No ?access_id: returns the raw table (used by the flat
 *              Route Access admin list page — unchanged behavior).
 *              With ?access_id=X: returns that role's permission for
 *              EVERY known route in the catalog, defaulting missing rows
 *              to NO-ACCESS instead of omitting them, so the permission
 *              editor always shows a complete list. If the role is
 *              PROTECTED (Administrator), every route is forced to
 *              FULL-ACCESS in the response regardless of stored rows.
 */
const getMasterRouteAccess = async (req, res) => {
  const { access_id } = req.query

  try {
    if (!access_id) {
      const { sql, bindings } = SQL.model(Master.RouteAccess)
        .select([
          Master.RouteAccess.cols.id,
          Master.RouteAccess.cols.access_id,
          Master.RouteAccess.cols.name,
          Master.RouteAccess.cols.status,
          Master.RouteAccess.cols.createdAt,
        ])
        .build()

      const result = await Query(sql, bindings)
      return res.status(200).json(result)
    }

    const accessRows = await Query(
      `SELECT ${Master.Access.cols.name} AS name FROM ${Master.Access.table} WHERE ${Master.Access.pk} = ?`,
      [access_id],
    )
    const accessName = (accessRows?.[0]?.name || '').toUpperCase()
    const isProtected = PROTECTED_ACCESS_NAMES.includes(accessName)

    const catalogRows = await Query(
      `SELECT DISTINCT ${Master.RouteAccess.cols.name} AS name
       FROM ${Master.RouteAccess.table}
       WHERE ${Master.RouteAccess.cols.name} IS NOT NULL
       ORDER BY ${Master.RouteAccess.cols.name} ASC`,
    )

    const existingRows = await Query(
      `SELECT ${Master.RouteAccess.pk} AS id, ${Master.RouteAccess.cols.name} AS name, ${Master.RouteAccess.cols.status} AS status
       FROM ${Master.RouteAccess.table}
       WHERE ${Master.RouteAccess.cols.access_id} = ?`,
      [access_id],
    )
    const byName = new Map(existingRows.map((row) => [row.name, row]))

    const merged = catalogRows.map(({ name }) => {
      const existing = byName.get(name)
      return {
        id: existing?.id || null,
        access_id: Number(access_id),
        name,
        status: isProtected ? 'FULL-ACCESS' : existing?.status || 'NO-ACCESS',
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
 * @description Sets one role's permission for one route. Finds the
 *              existing (access_id, name) row and updates it if present,
 *              inserts otherwise. The previous version could only UPDATE
 *              a row by an already-known mra_id, so there was no way to
 *              create a permission row for a role/route pair that didn't
 *              exist yet — which is exactly what the editor needs to do
 *              the first time a role's permissions are configured.
 *              PROTECTED roles (Administrator) cannot be set to
 *              NO-ACCESS through this endpoint.
 */
const upsertMasterRouteAccess = async (req, res) => {
  const { id, access_id, name, status } = req.body
  const userId = req.user?.id || req.userId || null

  if (!access_id || !name) {
    return res.status(400).json({ message: 'access_id and name are required' })
  }

  try {
    const accessRows = await Query(
      `SELECT ${Master.Access.cols.name} AS name FROM ${Master.Access.table} WHERE ${Master.Access.pk} = ?`,
      [access_id],
    )
    const accessName = accessRows?.[0]?.name
    if (
      PROTECTED_ACCESS_NAMES.includes((accessName || '').toUpperCase()) &&
      status === 'NO-ACCESS'
    ) {
      return res.status(400).json({
        message: `${accessName} must always retain FULL-ACCESS and cannot be set to NO-ACCESS.`,
      })
    }

    let targetId = id
    if (!targetId) {
      const existing = await Query(
        `SELECT ${Master.RouteAccess.pk} AS id FROM ${Master.RouteAccess.table}
         WHERE ${Master.RouteAccess.cols.access_id} = ? AND ${Master.RouteAccess.cols.name} = ?
         LIMIT 1`,
        [access_id, name],
      )
      targetId = existing?.[0]?.id || null
    }

    let query
    if (targetId) {
      let updateData = {}
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
          [Master.RouteAccess.cols.access_id]: access_id,
          [Master.RouteAccess.cols.name]: name,
          [Master.RouteAccess.cols.status]: status || 'NO-ACCESS',
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
