/**
 * ⚠️ AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 */

/**
 * @typedef {Object} FlagCols
 * @property {'rfg_id'} id
 * @property {'rfg_liquidation_id'} liquidation_id
 * @property {'rfg_liquidation_item_id'} liquidation_item_id
 * @property {'rfg_from'} from
 * @property {'rfg_to'} to
 * @property {'rfg_mode_of_transportation_id'} mode_of_transportation_id
 * @property {'rfg_min_amount'} min_amount
 * @property {'rfg_max_amount'} max_amount
 * @property {'rfg_amount'} amount
 * @property {'rfg_created_by'} created_by
 * @property {'rfg_status'} status
 * @property {'rfg_approval_status'} approval_status
 * @property {'rfg_updated_by'} updated_by
 * @property {'rfg_resolution_remarks'} resolution_remarks
 * @property {'rfg_createdAt'} createdAt
 * @property {'rfg_updatedAt'} updatedAt
 */

const Red = {
  Flag: {
    table: 'red_flag',
    pk: 'rfg_id',
    prefix: 'rfg',
    /** @type {FlagCols} */
    cols: {
      id: 'rfg_id',
      liquidation_id: 'rfg_liquidation_id',
      liquidation_item_id: 'rfg_liquidation_item_id',
      from: 'rfg_from',
      to: 'rfg_to',
      mode_of_transportation_id: 'rfg_mode_of_transportation_id',
      min_amount: 'rfg_min_amount',
      max_amount: 'rfg_max_amount',
      amount: 'rfg_amount',
      created_by: 'rfg_created_by',
      status: 'rfg_status',
      approval_status: 'rfg_approval_status',
      updated_by: 'rfg_updated_by',
      resolution_remarks: 'rfg_resolution_remarks',
      createdAt: 'rfg_createdAt',
      updatedAt: 'rfg_updatedAt',
    },
    select: ['rfg_id', 'rfg_liquidation_id', 'rfg_liquidation_item_id', 'rfg_from', 'rfg_to', 'rfg_mode_of_transportation_id', 'rfg_min_amount', 'rfg_max_amount', 'rfg_amount', 'rfg_created_by', 'rfg_status', 'rfg_approval_status', 'rfg_updated_by', 'rfg_resolution_remarks', 'rfg_createdAt', 'rfg_updatedAt'],
    insert: ['rfg_liquidation_id', 'rfg_liquidation_item_id', 'rfg_from', 'rfg_to', 'rfg_mode_of_transportation_id', 'rfg_min_amount', 'rfg_max_amount', 'rfg_amount', 'rfg_created_by', 'rfg_status', 'rfg_approval_status', 'rfg_updated_by', 'rfg_resolution_remarks'],
  },
};

exports.Red = Red;