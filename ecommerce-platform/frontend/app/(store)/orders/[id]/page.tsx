'use client';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import Image from 'next/image';
import { Package, Truck, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { orderApi } from '@/lib/api';
import { formatCurrency, formatDate, getOrderStatusColor } from '@/lib/utils';
import toast from 'react-hot-toast';

const STATUS_STEPS = ['CREATED','CONFIRMED','PROCESSING','SHIPPED','DELIVERED'];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: order, isLoading, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: () => orderApi.getById(id),
    refetchInterval: 30_000, // poll every 30s for status updates
  });

  const cancelOrder = useMutation({
    mutationFn: () => orderApi.cancel(id),
    onSuccess: () => { toast.success('Order cancelled'); refetch(); },
    onError: () => toast.error('Cannot cancel this order'),
  });

  if (isLoading) return <div className="max-w-2xl mx-auto space-y-4 animate-pulse">{Array.from({length:4}).map((_,i)=><div key={i} className="h-20 bg-muted rounded-xl"/>)}</div>;
  if (!order) return <div className="text-center py-20">Order not found</div>;

  const currentStep = STATUS_STEPS.indexOf(order.status);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Order #{order.orderId.slice(0, 8)}</h1>
          <p className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getOrderStatusColor(order.status)}`}>
          {order.status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Progress bar */}
      {currentStep >= 0 && (
        <div className="rounded-xl border p-5">
          <div className="flex justify-between mb-2">
            {STATUS_STEPS.map((s, i) => (
              <div key={s} className={`flex flex-col items-center gap-1 text-xs ${i <= currentStep ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`h-7 w-7 rounded-full border-2 flex items-center justify-center ${i <= currentStep ? 'border-primary bg-primary text-primary-foreground' : 'border-muted'}`}>
                  {i < currentStep ? <CheckCircle className="h-4 w-4" /> : <span className="text-xs">{i+1}</span>}
                </div>
                <span className="hidden sm:block capitalize">{s.toLowerCase()}</span>
              </div>
            ))}
          </div>
          {order.trackingNumber && (
            <p className="text-sm text-center mt-3 text-muted-foreground">
              Tracking: <span className="font-medium text-foreground">{order.trackingNumber}</span>
            </p>
          )}
        </div>
      )}

      {/* Items */}
      <div className="rounded-xl border divide-y">
        {order.items.map((item) => (
          <div key={item.orderItemId} className="flex gap-3 p-4">
            <div className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-muted">
              <Image src={item.imageUrl || '/placeholder-product.jpg'} alt={item.productName} fill className="object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{item.productName}</p>
              <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
              <p className="text-xs text-muted-foreground">× {item.quantity}</p>
            </div>
            <p className="font-medium text-sm shrink-0">{formatCurrency(item.lineTotal)}</p>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="rounded-xl border p-5 space-y-2 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
        <div className="flex justify-between"><span>Shipping</span><span>{formatCurrency(order.shippingCost)}</span></div>
        {order.discountAmount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatCurrency(order.discountAmount)}</span></div>}
        <div className="border-t pt-2 flex justify-between font-bold text-base"><span>Total</span><span>{formatCurrency(order.totalPrice)}</span></div>
      </div>

      {/* Shipping address */}
      <div className="rounded-xl border p-5 space-y-1">
        <h3 className="font-semibold mb-2">Shipping To</h3>
        <p className="text-sm font-medium">{order.shippingAddress.fullName}</p>
        <p className="text-sm text-muted-foreground">
          {order.shippingAddress.street}, {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
        </p>
      </div>

      {/* Actions */}
      {['CREATED', 'CONFIRMED'].includes(order.status) && (
        <button
          onClick={() => cancelOrder.mutate()}
          disabled={cancelOrder.isPending}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-destructive text-destructive py-2.5 hover:bg-destructive/5 disabled:opacity-50"
        >
          <XCircle className="h-4 w-4" /> Cancel Order
        </button>
      )}
    </div>
  );
}
