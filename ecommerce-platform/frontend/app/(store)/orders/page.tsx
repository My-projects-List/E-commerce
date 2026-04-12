'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Package, ChevronRight } from 'lucide-react';
import { orderApi } from '@/lib/api';
import { formatCurrency, formatDate, getOrderStatusColor } from '@/lib/utils';

export default function OrdersPage() {
  const { data, isLoading } = useQuery({ queryKey: ['orders'], queryFn: () => orderApi.list() });

  if (isLoading) return <div className="space-y-3">{Array.from({length:4}).map((_,i) => <div key={i} className="h-24 rounded-xl border animate-pulse bg-muted"/>)}</div>;

  const orders = data?.content ?? [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">My Orders</h1>
      {orders.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <Package className="h-12 w-12 mx-auto text-muted-foreground opacity-30" />
          <p className="text-muted-foreground">No orders yet</p>
          <Link href="/products" className="text-primary underline text-sm">Start shopping</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order.orderId} href={`/orders/${order.orderId}`}
              className="flex items-center gap-4 rounded-xl border p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">#{order.orderId.slice(0, 8)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getOrderStatusColor(order.status)}`}>
                    {order.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                <p className="text-sm mt-1">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold">{formatCurrency(order.totalPrice)}</p>
                {order.trackingNumber && <p className="text-xs text-muted-foreground mt-1">Tracking: {order.trackingNumber}</p>}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
