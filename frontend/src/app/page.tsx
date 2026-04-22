'use client'

import { useState, useEffect } from 'react'
import { useUser, UserButton } from '@clerk/nextjs'
import { useTheme } from 'next-themes'

interface Order {
  id: string
  po_number: string
  supplier_name: string
  supplier_email: string
  item_description: string
  quantity: number
  expected_delivery: string
  actual_delivery: string | null
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'delayed'
  supplier_token: string
  notes: string | null
  created_at: string
}

interface Supplier {
  supplier_name: string
  total_orders: number
  on_time: number
  late: number
  reliability_score: number
}

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  shipped: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  delayed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

function SunIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
    </svg>
  )
}

export default function Home() {
  const { user } = useUser()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{created: number, errors: string[], message: string} | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [form, setForm] = useState({
    po_number: '',
    organization_name: 'My Company',
    supplier_name: '',
    supplier_email: '',
    item_description: '',
    quantity: '',
    expected_delivery: '',
  })

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (user) {
      fetchOrders()
      fetchSuppliers()
    }
  }, [user])

  const fetchOrders = async () => {
    if (!user) return
    try {
      const res = await fetch(`https://conduit-backend-production-de38.up.railway.app/api/orders/?user_id=${user.id}`)
      const data = await res.json()
      setOrders(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const fetchSuppliers = async () => {
    if (!user) return
    try {
      const res = await fetch(`https://conduit-backend-production-de38.up.railway.app/api/orders/suppliers/reliability?user_id=${user.id}`)
      const data = await res.json()
      setSuppliers(data)
    } catch (e) {
      console.error(e)
    }
  }

  const createOrder = async () => {
    try {
      const res = await fetch('https://conduit-backend-production-de38.up.railway.app/api/orders/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          user_id: user?.id,
          quantity: parseInt(form.quantity),
          expected_delivery: new Date(form.expected_delivery).toISOString(),
        }),
      })
      if (res.ok) {
        setShowForm(false)
        setForm({
          po_number: '',
          organization_name: 'My Company',
          supplier_name: '',
          supplier_email: '',
          item_description: '',
          quantity: '',
          expected_delivery: '',
        })
        fetchOrders()
        fetchSuppliers()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const deleteOrder = async (orderId: string) => {
    if (!user) return
    if (!confirm('Delete this order?')) return
    try {
      await fetch(`https://conduit-backend-production-de38.up.railway.app/api/orders/${orderId}?user_id=${user.id}`, {
        method: 'DELETE'
      })
      fetchOrders()
      fetchSuppliers()
    } catch (e) {
      console.error(e)
    }
  }

  const importCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setImporting(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch(`https://conduit-backend-production-de38.up.railway.app/api/orders/import/csv?user_id=${user.id}`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      setImportResult(data)
      fetchOrders()
      fetchSuppliers()
    } catch (e) {
      console.error(e)
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    const csv = `po_number,organization_name,supplier_name,supplier_email,item_description,quantity,expected_delivery
PO-001,My Company,ABC Supplier,supplier@company.com,Product description,100,2026-06-01
PO-002,My Company,XYZ Supplier,xyz@company.com,Another product,50,2026-06-15`
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'conduit_template.csv'
    a.click()
  }

  const now = new Date()

  const statusCounts = {
    total: orders.length,
    overdue: orders.filter(o => new Date(o.expected_delivery) < now && o.status !== 'delivered').length,
    pending: orders.filter(o => o.status === 'pending').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.po_number.toLowerCase().includes(search.toLowerCase()) ||
      order.supplier_name.toLowerCase().includes(search.toLowerCase()) ||
      order.item_description.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'overdue'
        ? new Date(order.expected_delivery) < now && order.status !== 'delivered'
        : order.status === filterStatus)
    return matchesSearch && matchesStatus
  })

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-8 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-none">Conduit</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Inbound Delivery Tracker</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={downloadTemplate}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Download Template
            </button>
            <label className={`text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer ${importing ? 'opacity-50' : ''}`}>
              {importing ? 'Importing...' : 'Import CSV'}
              <input type="file" accept=".csv" onChange={importCSV} className="hidden" disabled={importing} />
            </label>
            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />
            {mounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
              </button>
            )}
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              + New Order
            </button>
            <UserButton />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {importResult && (
          <div className={`mb-6 p-4 rounded-xl border text-sm ${importResult.errors.length > 0 ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'}`}>
            <div className="flex items-center justify-between">
              <p className={`font-medium ${importResult.errors.length > 0 ? 'text-yellow-800 dark:text-yellow-400' : 'text-green-800 dark:text-green-400'}`}>
                {importResult.message}
              </p>
              <button onClick={() => setImportResult(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
            </div>
            {importResult.errors.length > 0 && (
              <ul className="mt-2 text-yellow-700 dark:text-yellow-500 space-y-1">
                {importResult.errors.map((e, i) => <li key={i}>• {e}</li>)}
              </ul>
            )}
          </div>
        )}

        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Overdue', value: statusCounts.overdue, color: statusCounts.overdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400', border: statusCounts.overdue > 0 ? 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900' },
            { label: 'Total Orders', value: statusCounts.total, color: 'text-gray-900 dark:text-white', border: 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900' },
            { label: 'Pending', value: statusCounts.pending, color: 'text-yellow-600 dark:text-yellow-400', border: 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900' },
            { label: 'Delivered', value: statusCounts.delivered, color: 'text-green-600 dark:text-green-400', border: 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900' },
          ].map(stat => (
            <div key={stat.label} className={`rounded-xl border p-5 shadow-sm ${stat.border}`}>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{stat.label}</p>
              <p className={`text-4xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm mb-6">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between gap-4">
            <h2 className="font-semibold text-gray-900 dark:text-white whitespace-nowrap">Purchase Orders</h2>
            <div className="flex items-center gap-3 flex-1 max-w-lg">
              <input
                type="text"
                placeholder="Search PO number, supplier, item..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="overdue">Overdue</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="delayed">Delayed</option>
              </select>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{filteredOrders.length} orders</span>
          </div>
          {loading ? (
            <div className="px-6 py-12 text-center">
              <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {orders.length === 0 ? 'No orders yet. Create your first order to get started.' : 'No orders match your search.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    {['PO Number', 'Supplier', 'Item', 'Qty', 'Expected Delivery', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredOrders.map(order => {
                    const isOverdue = new Date(order.expected_delivery) < now && order.status !== 'delivered'
                    return (
                      <tr key={order.id} className={`transition-colors ${isOverdue ? 'bg-red-50 dark:bg-red-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            {order.po_number}
                            {isOverdue && (
                              <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400">
                                OVERDUE
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{order.supplier_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate">{order.item_description}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{order.quantity}</td>
                        <td className={`px-6 py-4 text-sm ${isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-600 dark:text-gray-300'}`}>
                          {new Date(order.expected_delivery).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => navigator.clipboard.writeText(`http://localhost:3000/supplier/${order.supplier_token}`)}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
                            >
                              Copy Link
                            </button>
                            <button
                              onClick={() => deleteOrder(order.id)}
                              className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {suppliers.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="font-semibold text-gray-900 dark:text-white">Supplier Reliability</h2>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  {['Supplier', 'Total Orders', 'On Time', 'Late', 'Reliability Score'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {suppliers.map(s => (
                  <tr key={s.supplier_name} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{s.supplier_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{s.total_orders}</td>
                    <td className="px-6 py-4 text-sm text-green-600 dark:text-green-400 font-medium">{s.on_time}</td>
                    <td className="px-6 py-4 text-sm text-red-600 dark:text-red-400 font-medium">{s.late}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-28 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${s.reliability_score >= 80 ? 'bg-green-500' : s.reliability_score >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${s.reliability_score}%` }}
                          />
                        </div>
                        <span className={`text-sm font-semibold ${s.reliability_score >= 80 ? 'text-green-600 dark:text-green-400' : s.reliability_score >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                          {s.reliability_score}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create New Order</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">✕</button>
            </div>
            <div className="space-y-4">
              {[
                { key: 'po_number', label: 'PO Number', type: 'text', placeholder: 'PO-003' },
                { key: 'supplier_name', label: 'Supplier Name', type: 'text', placeholder: 'ABC Supplier' },
                { key: 'supplier_email', label: 'Supplier Email', type: 'email', placeholder: 'supplier@company.com' },
                { key: 'item_description', label: 'Item Description', type: 'text', placeholder: 'Contact lenses 500 units' },
                { key: 'quantity', label: 'Quantity', type: 'number', placeholder: '500' },
                { key: 'expected_delivery', label: 'Expected Delivery', type: 'date', placeholder: '' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">{field.label}</label>
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    value={form[field.key as keyof typeof form]}
                    onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createOrder}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                Create Order
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}