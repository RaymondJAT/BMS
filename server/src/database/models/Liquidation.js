/**
 * ⚠️ AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 */

/**
 * @typedef {Object} LiquidationCols
 * @property {'l_id'} id
 * @property {'l_cash_request_id'} cash_request_id
 * @property {'l_description'} description
 * @property {'l_amount_obtained'} amount_obtained
 * @property {'l_amount_expended'} amount_expended
 * @property {'l_reimburse_return'} reimburse_return
 * @property {'l_status'} status
 * @property {'l_createdAt'} createdAt
 */

/**
 * @typedef {Object} ItemCols
 * @property {'li_id'} id
 * @property {'li_liquidation_id'} liquidation_id
 * @property {'li_date'} date
 * @property {'li_rt'} rt
 * @property {'li_store_name'} store_name
 * @property {'li_particulars'} particulars
 * @property {'li_from'} from
 * @property {'li_to'} to
 * @property {'li_mode_of_transportation_id'} mode_of_transportation_id
 * @property {'li_amount'} amount
 */

/**
 * @typedef {Object} ActivityCols
 * @property {'la_id'} id
 * @property {'la_liquidation_id'} liquidation_id
 * @property {'la_action'} action
 * @property {'la_remarks'} remarks
 * @property {'la_receipt'} receipt
 * @property {'la_created_by'} created_by
 * @property {'la_createdAt'} createdAt
 */

const Liquidation = {
  Liquidation: {
    table: 'liquidation',
    pk: 'l_id',
    prefix: 'l',
    /** @type {LiquidationCols} */
    cols: {
      id: 'l_id',
      cash_request_id: 'l_cash_request_id',
      description: 'l_description',
      amount_obtained: 'l_amount_obtained',
      amount_expended: 'l_amount_expended',
      reimburse_return: 'l_reimburse_return',
      status: 'l_status',
      createdAt: 'l_createdAt',
    },
    select: [
      'l_id',
      'l_cash_request_id',
      'l_description',
      'l_amount_obtained',
      'l_amount_expended',
      'l_reimburse_return',
      'l_status',
      'l_createdAt',
    ],
    insert: [
      'l_cash_request_id',
      'l_description',
      'l_amount_obtained',
      'l_amount_expended',
      'l_reimburse_return',
      'l_status',
    ],
  },
  Item: {
    table: 'liquidation_item',
    pk: 'li_id',
    prefix: 'li',
    /** @type {ItemCols} */
    cols: {
      id: 'li_id',
      liquidation_id: 'li_liquidation_id',
      date: 'li_date',
      rt: 'li_rt',
      store_name: 'li_store_name',
      particulars: 'li_particulars',
      from: 'li_from',
      to: 'li_to',
      mode_of_transportation_id: 'li_mode_of_transportation_id',
      amount: 'li_amount',
    },
    select: [
      'li_id',
      'li_liquidation_id',
      'li_date',
      'li_rt',
      'li_store_name',
      'li_particulars',
      'li_from',
      'li_to',
      'li_mode_of_transportation_id',
      'li_amount',
    ],
    insert: [
      'li_liquidation_id',
      'li_rt',
      'li_store_name',
      'li_particulars',
      'li_from',
      'li_to',
      'li_mode_of_transportation_id',
      'li_amount',
    ],
  },
  Activity: {
    table: 'liquidation_activity',
    pk: 'la_id',
    prefix: 'la',
    /** @type {ActivityCols} */
    cols: {
      id: 'la_id',
      liquidation_id: 'la_liquidation_id',
      action: 'la_action',
      remarks: 'la_remarks',
      receipt: 'la_receipt',
      created_by: 'la_created_by',
      createdAt: 'la_createdAt',
    },
    select: [
      'la_id',
      'la_liquidation_id',
      'la_action',
      'la_remarks',
      'la_receipt',
      'la_created_by',
      'la_createdAt',
    ],
    insert: ['la_liquidation_id', 'la_action', 'la_remarks', 'la_receipt', 'la_created_by'],
  },
}

exports.Liquidation = Liquidation
