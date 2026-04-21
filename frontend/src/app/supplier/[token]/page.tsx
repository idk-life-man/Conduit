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
      const res = await fetch(`http://localhost:8000/api/orders/supplier/${token}`)
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

      const res = await fetch(`http://localhost:8000/api/orders/supplier/${token}`, {
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
      <p className="text-gray-500">Loading...</p>
    </div>
  )

  if (!order) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-red-500">Invalid or expired link.</p>
    </div>
  )

  if (updated) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg border border-gray-200 p-8 max-w-md w-full text-center">
        <div className="text-green-500 text-5xl mb-4">✓</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Update Received</h2>
        <p className="text-gray-500">Thank you for updating the delivery status for {order.po_number}.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-gray-200 p-8 max-w-md w-full">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Delivery Update</h1>
          <p className="text-sm text-gray-500 mt-1">Please update the status for your shipment</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">PO Number</span>
            <span className="font-medium text-gray-900">{order.po_number}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Item</span>
            <span className="font-medium text-gray-900">{order.item_description}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Quantity</span>
            <span className="font-medium text-gray-900">{order.quantity}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Expected Delivery</span>
            <span className="font-medium text-gray-900">
              {new Date(order.expected_delivery).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {status === 'delivered' ? 'Delivery Date' : 'Ship Date'}
              </label>
              <input
                type="date"
                value={actualDelivery}
                onChange={e => setActualDelivery(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any updates or comments about this shipment..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={updateOrder}
            disabled={updating}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {updating ? 'Updating...' : 'Submit Update'}
          </button>
        </div>
      </div>
    </div>
  )
}