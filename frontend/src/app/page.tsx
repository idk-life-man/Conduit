'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

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

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  delayed: 'bg-red-100 text-red-800',
}

export default function Home() {
  const { user } = useUser()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    po_number: '',
    organization_name: 'My Company',
    supplier_name: '',
    supplier_email: '',
    item_description: '',
    quantity: '',
    expected_delivery: '',
  })

  useEffect(() => {
    if (user) fetchOrders()
  }, [user])

  const fetchOrders = async () => {
    if (!user) return
    try {
      const res = await fetch(`http://localhost:8000/api/orders/?user_id=${user.id}`)
      const data = await res.json()
      setOrders(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const createOrder = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/orders/', {
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
      }
    } catch (e) {
      console.error(e)
    }
  }

  const now = new Date()

  const statusCounts = {
    total: orders.length,
    overdue: orders.filter(o =>
      new Date(o.expected_delivery) < now &&
      o.status !== 'delivered'
    ).length,
    pending: orders.filter(o => o.status === 'pending').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conduit</h1>
          <p className="text-sm text-gray-500">Inbound Delivery Tracker</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user?.emailAddresses[0]?.emailAddress}</span>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            + New Order
          </button>
        </div>
      </div>

      <div className="px-8 py-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Overdue', value: statusCounts.overdue, color: statusCounts.overdue > 0 ? 'text-red-600' : 'text-gray-400' },
            { label: 'Total Orders', value: statusCounts.total, color: 'text-gray-900' },
            { label: 'Pending', value: statusCounts.pending, color: 'text-yellow-600' },
            { label: 'Delivered', value: statusCounts.delivered, color: 'text-green-600' },
          ].map(stat => (
            <div key={stat.label} className={`bg-white rounded-lg border p-4 ${stat.label === 'Overdue' && statusCounts.overdue > 0 ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Purchase Orders</h2>
          </div>
          {loading ? (
            <div className="px-6 py-8 text-center text-gray-500">Loading...</div>
          ) : orders.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No orders yet. Create your first order to get started.
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['PO Number', 'Supplier', 'Item', 'Qty', 'Expected', 'Status', 'Supplier Link'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map(order => {
                  const isOverdue = new Date(order.expected_delivery) < now && order.status !== 'delivered'
                  return (
                    <tr key={order.id} className={`hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : ''}`}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {order.po_number}
                        {isOverdue && <span className="ml-2 text-xs text-red-600 font-medium">OVERDUE</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{order.supplier_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{order.item_description}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{order.quantity}</td>
                      <td className={`px-6 py-4 text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                        {new Date(order.expected_delivery).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => navigator.clipboard.writeText(`http://localhost:3000/supplier/${order.supplier_token}`)}
                          className="text-blue-600 hover:text-blue-800 text-xs"
                        >
                          Copy Link
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Create New Order</h2>
            <div className="space-y-3">
              {[
                { key: 'po_number', label: 'PO Number', type: 'text', placeholder: 'PO-003' },
                { key: 'supplier_name', label: 'Supplier Name', type: 'text', placeholder: 'ABC Supplier' },
                { key: 'supplier_email', label: 'Supplier Email', type: 'email', placeholder: 'supplier@company.com' },
                { key: 'item_description', label: 'Item Description', type: 'text', placeholder: 'Contact lenses 500 units' },
                { key: 'quantity', label: 'Quantity', type: 'number', placeholder: '500' },
                { key: 'expected_delivery', label: 'Expected Delivery', type: 'date', placeholder: '' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    value={form[field.key as keyof typeof form]}
                    onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createOrder}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
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