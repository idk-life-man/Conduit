'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

interface Order {
  id: string
  po_number: string
  supplier_name: string
  item_description: string
  quantity: number
  expected_delivery: string
  status: string
  notes: string | null
}

export default function SupplierPage() {
  const params = useParams()
  const token = params.token as string
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [updated, setUpdated] = useState(false)
  const [status, setStatus] = useState('')
  const [notes, setNotes] = useState('')
  const [actualDelivery, setActualDelivery] = useState('')

  useEffect(() => {
    fetchOrder()
  }, [token])

  const fetchOrder = async () => {
    try {
      const res = await fetch(`https://conduit-backend-production-de38.up.railway.app/api/orders/supplier/${token}`)
      if (res.ok) {
        const data = await res.json()
        setOrder(data)
        setStatus(data.status)
        setNotes(data.notes || '')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const updateOrder = async () => {
    setUpdating(true)
    try {
      const body: Record<string, string> = { status }
      if (notes) body.notes = notes
      if (actualDelivery) body.actual_delivery = new Date(actualDelivery).toISOString()

      const res = await fetch(`https://conduit-backend-production-de38.up.railway.app/api/orders/supplier/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) setUpdated(true)
    } catch (e) {
      console.error(e)
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!order) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-500 font-medium">Invalid or expired link.</p>
        <p className="text-gray-500 text-sm mt-1">Please contact your supplier for a new link.</p>
      </div>
    </div>
  )

  if (updated) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-md w-full text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Update Received</h2>
        <p className="text-gray-500 text-sm">Thank you for updating the delivery status for <span className="font-medium text-gray-700">{order.po_number}</span>.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-md w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-none">Conduit</h1>
            <p className="text-xs text-gray-500">Delivery Update Request</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3">
          {[
            { label: 'PO Number', value: order.po_number },
            { label: 'Item', value: order.item_description },
            { label: 'Quantity', value: order.quantity.toString() },
            { label: 'Expected Delivery', value: new Date(order.expected_delivery).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) },
          ].map(row => (
            <div key={row.label} className="flex justify-between text-sm">
              <span className="text-gray-500">{row.label}</span>
              <span className="font-medium text-gray-900">{row.value}</span>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">Delivery Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="delayed">Delayed</option>
            </select>
          </div>

          {(status === 'delivered' || status === 'shipped') && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">
                {status === 'delivered' ? 'Actual Delivery Date' : 'Ship Date'}
              </label>
              <input
                type="date"
                value={actualDelivery}
                onChange={e => setActualDelivery(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any updates or comments about this shipment..."
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <button
            onClick={updateOrder}
            disabled={updating}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            {updating ? 'Submitting...' : 'Submit Update'}
          </button>
        </div>
      </div>
    </div>
  )
}