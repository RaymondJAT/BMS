const { Query, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Master } = require('../database/models/Master')
const SQL = new SQLQueryBuilder()

/**
 * @name upsertMasterProject
 * @description Create or update a Project. Administrator-managed list —
 *              this is the single source of truth for the "Project"
 *              dropdown on the Cash Request form (see
 *              CreateCashRequestModal.jsx). New projects default to
 *              ACTIVE so they immediately appear as selectable; setting
 *              status to INACTIVE hides a project from that dropdown
 *              without deleting it or breaking existing Cash Requests
 *              that already reference its name (cash_request.cr_project
 *              stores the name as free text at request time, not a live
 *              foreign key — see cashRequestController.js).
 */
const upsertMasterProject = async (req, res) => {
  // #swagger.tags = ['Project']
  // #swagger.description = 'Create or update a Project. Omit id to create.'
  // #swagger.autoBody = false
  // #swagger.consumes = ['application/x-www-form-urlencoded', 'application/json']
  /*
    #swagger.parameters['id'] = { in: 'formData', type: 'string', required: false, description: 'Project id — include to update, omit to create' }
    #swagger.parameters['name'] = { in: 'formData', type: 'string', required: true, description: 'Project name' }
    #swagger.parameters['status'] = { in: 'formData', type: 'string', required: false, description: 'ACTIVE or INACTIVE — defaults to ACTIVE on create' }
  */

  // TEMP: matches the `req.userId || req.user?.id || 1` fallback used
  // across the other controllers until real auth is wired up.
  const userId = req.userId || req.user?.id || 1
  const { id, name, status } = req.body

  let query

  try {
    if (id) {
      const updateData = {}
      if (name !== undefined) {
        const trimmedName = String(name).trim()
        if (!trimmedName) {
          return res.status(400).json({ message: 'name cannot be empty' })
        }
        updateData[Master.Project.cols.name] = trimmedName
      }
      if (status !== undefined) updateData[Master.Project.cols.status] = status

      if (Master.Project.cols.updatedAt) updateData[Master.Project.cols.updatedAt] = new Date()
      if (Master.Project.cols.updatedBy) updateData[Master.Project.cols.updatedBy] = userId

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No data to update' })
      }

      query = SQL.model(Master.Project).update(updateData).where(Master.Project.pk, id).build()
    } else {
      if (!name || !String(name).trim()) {
        return res.status(400).json({ message: 'Missing required field: name' })
      }

      query = SQL.model(Master.Project)
        .insert({
          [Master.Project.cols.name]: String(name).trim(),
          // Defaults to ACTIVE so a newly-created project is immediately
          // selectable on the Cash Request form without a second step.
          [Master.Project.cols.status]: status || 'ACTIVE',
          ...(Master.Project.cols.createdBy ? { [Master.Project.cols.createdBy]: userId } : {}),
          ...(Master.Project.cols.createdAt ? { [Master.Project.cols.createdAt]: new Date() } : {}),
        })
        .build()
    }

    const result = await Query(query.sql, query.bindings)

    if (id && result.affectedRows === 0) {
      return res.status(404).json({ message: 'Project not found' })
    }

    return res.status(200).json({
      message: id ? 'Updated successfully' : 'Created successfully',
      id: id || result.insertId,
    })
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Error processing Project' })
  }
}

/**
 * @name getMasterProject
 * @description Get all Project records. Supports an optional ?status=
 *              filter so the Cash Request dropdown can request only
 *              ACTIVE projects, while an admin-facing Master Projects
 *              page can call this with no filter to see everything
 *              (including INACTIVE, for re-activation/editing).
 */
const getMasterProject = async (req, res) => {
  // #swagger.tags = ['Project']
  // #swagger.description = 'Get all Project records, optionally filtered by status.'
  /*
    #swagger.parameters['status'] = { in: 'query', type: 'string', required: false, description: 'Filter by status, e.g. ACTIVE' }
  */

  const { status } = req.query

  try {
    let builder = SQL.model(Master.Project).select([
      Master.Project.cols.id,
      Master.Project.cols.name,
      Master.Project.cols.status,
      Master.Project.cols.createdAt,
    ])

    if (status) {
      builder = builder.where(Master.Project.cols.status, status)
    }

    const { sql, bindings } = builder.build()
    const result = await Query(sql, bindings)

    return res.status(200).json(result)
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Error retrieving Project records' })
  }
}

module.exports = {
  getMasterProject,
  upsertMasterProject,
}
