import React, { useState } from 'react'
import { Modal } from '../../ui/Modal'

export default function CreateRevolvingFundModal({ isOpen, onClose, onCreate }) {
  const [formData, setFormData] = useState({
    name: '',
    baseCap: '',
    startDate: '',
    endDate: '',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name || !formData.baseCap) return

    const cap = parseFloat(formData.baseCap) || 0
    const newFund = {
      id: `RF-2026-00${Math.floor(Math.random() * 90) + 10}`,
      name: formData.name,
      startDate: formData.startDate || '2026-01-01',
      endDate: formData.endDate || '2026-12-31',
      baseCap: cap,
      replenished: 0,
      totalAvailable: cap,
      issued: 0,
      expended: 0,
      returned: 0,
      liquidated: 0,
      unliquidated: 0,
      balance: cap,
      status: 'Active',
    }

    onCreate(newFund)
    setFormData({ name: '', baseCap: '', startDate: '', endDate: '' })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Revolving Fund">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Fund Name / Custodian Title
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Petty Cash - Marketing Dept"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837]"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Initial Base Allocation Cap (PHP)
          </label>
          <input
            type="number"
            required
            step="0.01"
            placeholder="50000.00"
            value={formData.baseCap}
            onChange={(e) => setFormData({ ...formData, baseCap: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Start Date
            </label>
            <input
              type="date"
              required
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              End Date
            </label>
            <input
              type="date"
              required
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837]"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 text-xs font-bold text-white bg-[#E31837] hover:bg-[#c4122e] rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Create Revolving Fund
          </button>
        </div>
      </form>
    </Modal>
  )
}
