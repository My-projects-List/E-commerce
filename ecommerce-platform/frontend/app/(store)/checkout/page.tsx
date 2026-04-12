'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CreditCard, MapPin, Lock } from 'lucide-react';
import { userApi, orderApi, cartApi } from '@/lib/api';
import { useCartStore } from '@/lib/store';
import { formatCurrency, generateIdempotencyKey } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, setCart } = useCartStore();
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [coupon, setCoupon] = useState('');
  const [step, setStep] = useState<'address' | 'payment' | 'review'>('address');

  const { data: addresses = [] } = useQuery({ queryKey: ['addresses'], queryFn: userApi.getAddresses });

  const placeOrder = useMutation({
    mutationFn: () =>
      orderApi.checkout({
        idempotencyKey: generateIdempotencyKey(),
        shippingAddressId: selectedAddress,
        paymentMethodId,
        couponCode: coupon || undefined,
      }),
    onSuccess: async (order) => {
      await cartApi.clear().catch(() => {});
      setCart(null);
      toast.success('Order placed successfully!');
      router.push(`/orders/${order.orderId}`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? 'Order failed. Please try again.');
    },
  });

  const shipping = 4.99;
  const subtotal = cart?.subtotal ?? 0;
  const discount = cart?.discountAmount ?? 0;
  const total = Math.max(0, subtotal - discount + (subtotal >= 50 ? 0 : shipping));

  if (!cart?.items.length) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Your cart is empty</p>
        <button onClick={() => router.push('/products')} className="mt-4 text-primary underline">
          Continue shopping
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      {/* Steps */}
      <div className="flex items-center gap-2 mb-8 text-sm">
        {(['address', 'payment', 'review'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <div className="h-px w-8 bg-border" />}
            <button
              onClick={() => step !== 'review' && setStep(s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium capitalize transition-colors ${step === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            >
              <span className="h-5 w-5 rounded-full border-2 flex items-center justify-center text-xs">{i + 1}</span>
              {s}
            </button>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left panel */}
        <div className="lg:col-span-2 space-y-5">
          {/* Address */}
          {step === 'address' && (
            <div className="rounded-xl border p-5 space-y-4">
              <h2 className="font-semibold flex items-center gap-2"><MapPin className="h-5 w-5" /> Shipping Address</h2>
              {addresses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No addresses saved. <a href="/profile" className="text-primary underline">Add one</a></p>
              ) : (
                <div className="space-y-2">
                  {addresses.map((addr) => (
                    <label key={addr.addressId} className={`flex gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${selectedAddress === addr.addressId ? 'border-primary bg-primary/5' : ''}`}>
                      <input type="radio" name="address" value={addr.addressId}
                        checked={selectedAddress === addr.addressId}
                        onChange={() => setSelectedAddress(addr.addressId)}
                        className="mt-1"
                      />
                      <div className="text-sm">
                        <p className="font-medium">{addr.fullName} {addr.isDefault && <span className="text-xs text-primary">(Default)</span>}</p>
                        <p className="text-muted-foreground">{addr.street}, {addr.city}, {addr.state} {addr.zipCode}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              <button
                disabled={!selectedAddress}
                onClick={() => setStep('payment')}
                className="w-full rounded-xl bg-primary py-2.5 font-semibold text-primary-foreground disabled:opacity-50"
              >
                Continue to Payment
              </button>
            </div>
          )}

          {/* Payment */}
          {step === 'payment' && (
            <div className="rounded-xl border p-5 space-y-4">
              <h2 className="font-semibold flex items-center gap-2"><CreditCard className="h-5 w-5" /> Payment Method</h2>
              <p className="text-sm text-muted-foreground">
                In production, integrate <strong>Stripe Elements</strong> here using{' '}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">@stripe/react-stripe-js</code>.
                The <code className="text-xs bg-muted px-1 py-0.5 rounded">paymentMethodId</code> (Stripe token)
                is sent to <code className="text-xs bg-muted px-1 py-0.5 rounded">POST /api/payments/process</code>.
              </p>
              <div className="rounded-lg border bg-muted p-4 text-sm space-y-2">
                <p className="font-medium">Demo mode</p>
                <input
                  className="w-full rounded border bg-background px-3 py-2 text-sm"
                  placeholder="Enter payment method ID (pm_...)"
                  value={paymentMethodId}
                  onChange={(e) => setPaymentMethodId(e.target.value)}
                />
              </div>
              <button onClick={() => setStep('review')} disabled={!paymentMethodId}
                className="w-full rounded-xl bg-primary py-2.5 font-semibold text-primary-foreground disabled:opacity-50">
                Review Order
              </button>
            </div>
          )}

          {/* Review */}
          {step === 'review' && (
            <div className="rounded-xl border p-5 space-y-4">
              <h2 className="font-semibold">Review Your Order</h2>
              <div className="space-y-2">
                {cart.items.map((item) => (
                  <div key={item.productId} className="flex justify-between text-sm">
                    <span>{item.name} × {item.quantity}</span>
                    <span className="font-medium">{formatCurrency(item.lineTotal)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Coupon Code</label>
                <div className="flex gap-2">
                  <input className="flex-1 rounded-lg border px-3 py-2 text-sm" placeholder="SAVE20"
                    value={coupon} onChange={(e) => setCoupon(e.target.value)} />
                </div>
              </div>
              <button
                onClick={() => placeOrder.mutate()}
                disabled={placeOrder.isPending}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                <Lock className="h-4 w-4" />
                {placeOrder.isPending ? 'Placing Order…' : `Pay ${formatCurrency(total)}`}
              </button>
            </div>
          )}
        </div>

        {/* Order summary */}
        <div className="rounded-xl border p-5 h-fit space-y-3">
          <h3 className="font-semibold">Order Summary</h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>{subtotal >= 50 ? 'Free' : formatCurrency(shipping)}</span></div>
            {discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatCurrency(discount)}</span></div>}
          </div>
          <div className="border-t pt-3 flex justify-between font-bold">
            <span>Total</span><span>{formatCurrency(total)}</span>
          </div>
          {subtotal < 50 && <p className="text-xs text-muted-foreground">Add {formatCurrency(50 - subtotal)} more for free shipping</p>}
        </div>
      </div>
    </div>
  );
}
