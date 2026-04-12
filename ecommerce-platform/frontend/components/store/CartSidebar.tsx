'use client';
import { X, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cartApi } from '@/lib/api';
import { useCartStore } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

export function CartSidebar() {
  const qc = useQueryClient();
  const { isOpen, closeCart, cart, setCart } = useCartStore();

  useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const c = await cartApi.get();
      setCart(c);
      return c;
    },
    enabled: isOpen,
  });

  const updateQty = useMutation({
    mutationFn: ({ productId, qty }: { productId: string; qty: number }) =>
      cartApi.updateQuantity(productId, qty),
    onSuccess: (c) => setCart(c),
    onError: () => toast.error('Update failed'),
  });

  const removeItem = useMutation({
    mutationFn: (productId: string) => cartApi.removeItem(productId),
    onSuccess: (c) => setCart(c),
    onError: () => toast.error('Remove failed'),
  });

  if (!isOpen) return null;

  const items = cart?.items ?? [];

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={closeCart} />

      {/* Drawer */}
      <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-sm bg-background shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Cart ({cart?.itemCount ?? 0})
          </h2>
          <button onClick={closeCart} className="p-1 rounded-md hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <ShoppingBag className="h-12 w-12 opacity-30" />
              <p>Your cart is empty</p>
              <button onClick={closeCart} className="text-sm text-primary underline">Continue shopping</button>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.productId} className="flex gap-3">
                <div className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-muted">
                  <Image src={item.imageUrl || '/placeholder-product.jpg'} alt={item.name} fill className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-2">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{formatCurrency(item.price)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => updateQty.mutate({ productId: item.productId, qty: item.quantity - 1 })}
                      disabled={item.quantity <= 1}
                      className="h-6 w-6 rounded border flex items-center justify-center disabled:opacity-40"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-sm w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQty.mutate({ productId: item.productId, qty: item.quantity + 1 })}
                      className="h-6 w-6 rounded border flex items-center justify-center"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => removeItem.mutate(item.productId)}
                      className="ml-auto p-1 rounded hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t px-4 py-4 space-y-3">
            {cart?.couponCode && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Coupon ({cart.couponCode})</span>
                <span>-{formatCurrency(cart.discountAmount ?? 0)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold">
              <span>Subtotal</span>
              <span>{formatCurrency(cart?.subtotal ?? 0)}</span>
            </div>
            <Link
              href="/checkout"
              onClick={closeCart}
              className="block w-full rounded-lg bg-primary py-3 text-center text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Proceed to Checkout
            </Link>
            <Link
              href="/cart"
              onClick={closeCart}
              className="block w-full rounded-lg border py-2.5 text-center text-sm hover:bg-accent transition-colors"
            >
              View Full Cart
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
