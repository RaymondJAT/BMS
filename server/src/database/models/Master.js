/**
 * ⚠️ AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 */

/**
 * @typedef {Object} AccessCols
 * @property {'id'} id
 * @property {'name'} name
 * @property {'description'} description
 * @property {'createdAt'} createdAt
 * @property {'updatedAt'} updatedAt
 */

const Master = {
  Access: {
    table: 'master_access',
    pk: 'id',
    prefix: '',
    /** @type {AccessCols} */
    cols: {
      id: 'id',
      name: 'name',
      description: 'description',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
    select: ['id', 'name', 'description', 'createdAt', 'updatedAt'],
    insert: ['name', 'description'],
  },
};

exports.Master = Master;