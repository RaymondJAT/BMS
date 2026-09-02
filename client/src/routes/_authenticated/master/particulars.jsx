import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo, useCallback, useRef } from 'react'
import Papa from 'papaparse'
import DataTable from '../../../components/ui/DataTable'
import StatCard from '../../../components/ui/StatCard'
import EditParticularsModal from '../../../components/dashboard/particulars/EditParticularsModal'
import {
  Search,
  Filter,
  FileSpreadsheet,
  FileUp,
  Tags,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { createParticularsColumns } from '../../../config/tables/particularsColumns'
import { useParticulars } from '../../../hooks/useParticulars'

export const Route = createFileRoute('/_authenticated/master/particulars')({
  component: ParticularsPage,
})

export default function ParticularsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedIds, setSelectedIds] = useState([])
  const [selectedParticular, setSelectedParticular] = useState(null)
  const [isEditOpen, setIsEditOpen] = useState(false)

  const fileInputRef = useRef(null)

  const { particulars, isLoading, isSubmitting, error, updateStatus, importParticulars } =
    useParticulars()

  const handleEdit = useCallback((row) => {
    setSelectedParticular(row)
    setIsEditOpen(true)
  }, [])

  const handleSelectionChange = useCallback((keys) => {
    setSelectedIds(keys)
  }, [])

  // Metrics calculation
  const metrics = useMemo(() => {
    const total = particulars.length
    const active = particulars.filter(
      (p) => (p.status || 'ACTIVE').toUpperCase() === 'ACTIVE',
    ).length
    const inactive = total - active
    return { total, active, inactive }
  }, [particulars])

  // Search & Filter
  const filteredParticulars = useMemo(() => {
    return particulars.filter((item) => {
      const q = searchTerm.toLowerCase()
      const code = (item.code || '').toLowerCase()
      const name = (item.name || '').toLowerCase()
      const type = (item.type || '').toLowerCase()
      const description = (item.description || '').toLowerCase()

      const matchesSearch =
        code.includes(q) || name.includes(q) || type.includes(q) || description.includes(q)

      const currentStatus = (item.status || 'ACTIVE').toUpperCase()
      const matchesStatus = statusFilter === 'ALL' || currentStatus === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [particulars, searchTerm, statusFilter])

  // CSV Export Handler
  const handleExportCSV = useCallback(() => {
    const exportItems =
      selectedIds.length > 0
        ? particulars.filter((p) => selectedIds.includes(p.id))
        : filteredParticulars

    if (!exportItems.length) return

    const headers = ['code', 'name', 'type', 'description', 'status']
    const csvRows = [
      headers.join(','),
      ...exportItems.map((item) =>
        [
          `"${item.code || ''}"`,
          `"${item.name || ''}"`,
          `"${item.type || ''}"`,
          `"${(item.description || '').replace(/"/g, '""')}"`,
          `"${item.status || 'ACTIVE'}"`,
        ].join(','),
      ),
    ]

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `particulars_export_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [selectedIds, particulars, filteredParticulars])

  // Robust PapaParse CSV Import Handler
  const handleFileUpload = useCallback(
    (e) => {
      const file = e.target.files?.[0]
      if (!file) return

      Papa.parse(file, {
        header: true,
        skipEmptyLines: 'greedy',
        // Strip UTF-8 BOM characters, whitespace, and normalize headers
        transformHeader: (h) =>
          h
            .replace(/^\uFEFF/, '')
            .trim()
            .toLowerCase(),
        complete: async (results) => {
          if (!results.data || results.data.length === 0) return

          const parsedItems = results.data.map((rowObj, idx) => {
            // Flexible property lookup in case CSV headers vary slightly
            const code = rowObj.code || rowObj['particular code'] || rowObj['item code']
            const name =
              rowObj.name || rowObj['particular name'] || rowObj['item name'] || rowObj.particular
            const type = rowObj.type || rowObj.category
            const description = rowObj.description || rowObj.desc || rowObj.details
            const status = rowObj.status

            return {
              code: code ? String(code).trim() : `P-${idx + 100}`,
              name: name ? String(name).trim() : 'Unnamed Particular',
              type: type ? String(type).trim() : 'General',
              description: description ? String(description).trim() : '',
              status: status ? String(status).trim().toUpperCase() : 'ACTIVE',
            }
          })

          try {
            await importParticulars(parsedItems)
          } catch (err) {
            console.error('Import Error:', err)
          } finally {
            if (fileInputRef.current) fileInputRef.current.value = ''
          }
        },
        error: (err) => {
          console.error('PapaParse error:', err)
          if (fileInputRef.current) fileInputRef.current.value = ''
        },
      })
    },
    [importParticulars],
  )

  const columns = useMemo(() => createParticularsColumns({ onEdit: handleEdit }), [handleEdit])

  return (
    <div className="w-full h-full flex-1 flex flex-col min-h-0 space-y-3 overflow-hidden">
      {/* Hidden File Input for Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".csv"
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shrink-0">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
            Master Particulars
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Manage disbursement categories, line items, codes, and description lookup entries.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg transition-all shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <FileUp className="w-3.5 h-3.5 text-blue-600" />
            Import CSV
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg transition-all shadow-2xs cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Export
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
        <StatCard
          title="Total Particulars"
          value={metrics.total}
          icon={Tags}
          subtitle="Registered line items"
          variant="blue"
        />
        <StatCard
          title="Active Items"
          value={metrics.active}
          icon={CheckCircle2}
          subtitle="Available for selection"
          variant="emerald"
        />
        <StatCard
          title="Inactive Items"
          value={metrics.inactive}
          icon={XCircle}
          subtitle="Disabled or archived"
          variant="amber"
        />
      </div>

      {/* Toolbar & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-white py-2 px-3 rounded-xl border border-slate-200/80 shrink-0">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Code, Name, Type, Description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="flex-1 min-h-0 w-full overflow-hidden">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200/80 p-6">
            <Loader2 className="w-6 h-6 text-[#E31837] animate-spin mb-2" />
            <p className="text-xs font-medium text-slate-500">Loading particulars...</p>
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center bg-white rounded-xl border border-rose-200 p-6 text-center">
            <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
            <p className="text-sm font-bold text-slate-800">Error Loading Data</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              {typeof error === 'string' ? error : error?.message || 'Failed to fetch particulars.'}
            </p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredParticulars}
            keyExtractor={(row) => row.id}
            selectable={false}
            selectedRows={selectedIds}
            onSelectionChange={handleSelectionChange}
            maxHeight="h-full"
            containerClassName="h-full flex flex-col min-h-0"
            emptyMessage={
              searchTerm || statusFilter !== 'ALL'
                ? 'No particulars match your search parameters.'
                : 'No particulars found. Import a CSV to populate entries.'
            }
            footer={
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>
                  Showing {filteredParticulars.length} entries
                  {selectedIds.length > 0 && ` (${selectedIds.length} selected)`}
                </span>
                <span>Fiscal Year 2026</span>
              </div>
            }
          />
        )}
      </div>

      {/* Edit Status Modal */}
      <EditParticularsModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        particular={selectedParticular}
        onUpdateStatus={updateStatus}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}
