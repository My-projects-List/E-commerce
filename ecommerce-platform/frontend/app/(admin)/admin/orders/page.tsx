'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { orderApi } from '@/lib/api';
import { formatCurrency, formatDate, getOrderStatusColor } from '@/lib/utils';
import type { OrderStatus } from '../../../../shared/types';

const STATUSES: (OrderStatus | '')[] = ['', 'CREATED', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export default function AdminOrdersPage() {
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');

  // NOTE: In a real implementation, the order service would have admin-level
  // GET /api/admin/orders?page=&status= endpoint. Currently using user-facing list as proxy.
  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', page],
    queryFn: () => orderApi.list(page),
  });

  const orders = (data?.content ?? []).filter((o) => !statusFilter || o.status === statusFilter);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Orders</h1>

      {/* Status filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${statusFilter === s ? 'bg-primary text-primary-foreground' : 'border hover:bg-accent'}`}
          >
            {s === '' ? 'All' : s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Order ID</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Date</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Items</th>
              <th className="text-left px-4 py-3 font-medium">Total</th>
              <th className="text-left px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse"/></td></tr>
              ))
            ) : orders.map((order) => (
              <tr key={order.orderId} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-mono text-xs">{order.orderId.slice(0, 12)}…</td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{formatDate(order.createdAt)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getOrderStatusColor(order.status)}`}>
                    {order.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{order.items.length}</td>
                <td className="px-4 py-3 font-semibold">{formatCurrency(order.totalPrice)}</td>
                <td className="px-4 py-3">
                  <Link href={`/orders/${order.orderId}`} className="text-xs text-primary hover:underline">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && (
        <div className="flex justify-center gap-2 text-sm">
          <button onClick={() => setPage(p => p-1)} disabled={data.first} className="px-3 py-1.5 rounded border disabled:opacity-40">Prev</button>
          <span className="px-3 py-1.5">Page {data.number+1} of {data.totalPages}</span>
          <button onClick={() => setPage(p => p+1)} disabled={data.last} className="px-3 py-1.5 rounded border disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
