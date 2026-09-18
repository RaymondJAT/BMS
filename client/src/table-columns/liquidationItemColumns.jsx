import { Image } from 'antd'

const formatCurrency = (val) =>
  `₱${parseFloat(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/**
 * Column set for the Liquidation Items table on LiquidationDetailPage.
 * Mirrors createLiquidationColumns (config/tables/liquidationColumns.js) —
 * same "factory function that takes the lookups it needs" shape, kept out
 * of the page component so the page stays focused on layout.
 */
export function createLiquidationItemColumns({ getParticularsName, getModeName, getStoreLabel }) {
  return [
    {
      header: 'DATE',
      accessorKey: 'date',
      cell: (row) => <span className="whitespace-nowrap">{row.date?.slice(0, 10) || '—'}</span>,
    },
    {
      header: 'RT#',
      accessorKey: 'rt',
      cell: (row) => <span className="font-medium text-slate-700">{row.rt || '—'}</span>,
    },
    {
      header: 'STORE NAME',
      accessorKey: 'store_name',
      cell: (row) => (getStoreLabel ? getStoreLabel(row.store_name) : row.store_name || '—'),
    },
    {
      header: 'PURPOSE',
      accessorKey: 'purpose',
      cell: (row) => row.purpose || '—',
    },
    {
      header: 'PARTICULARS',
      accessorKey: 'particulars',
      cell: (row) =>
        getParticularsName ? getParticularsName(row.particulars) : row.particulars || '—',
    },
    {
      header: 'FROM',
      accessorKey: 'from',
      cell: (row) => (getStoreLabel ? getStoreLabel(row.from) : row.from || '—'),
    },
    {
      header: 'TO',
      accessorKey: 'to',
      cell: (row) => (getStoreLabel ? getStoreLabel(row.to) : row.to || '—'),
    },
    {
      header: 'TRANSPORT MODE',
      accessorKey: 'mode_of_transportation_id',
      cell: (row) =>
        getModeName ? getModeName(row.mode_of_transportation_id) : row.transport_mode || '—',
    },
    {
      header: 'AMOUNT',
      accessorKey: 'amount',
      align: 'right',
      cell: (row) => (
        <span className="font-semibold text-slate-800">{formatCurrency(row.amount)}</span>
      ),
    },
    {
      header: 'RECEIPTS',
      accessorKey: 'receipts',
      cell: (row) => (
        <div className="flex items-center gap-1 flex-wrap">
          {(row.receipts || []).map((src, ri) => (
            <Image
              key={ri}
              src={src}
              width={28}
              height={28}
              style={{ objectFit: 'cover', borderRadius: 4 }}
            />
          ))}
        </div>
      ),
    },
  ]
}

export default createLiquidationItemColumns
