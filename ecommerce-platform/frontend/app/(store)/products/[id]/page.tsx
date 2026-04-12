'use client';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import Image from 'next/image';
import { Star, ShoppingCart, Heart, Minus, Plus, Truck, Shield } from 'lucide-react';
import { productApi, cartApi } from '@/lib/api';
import { useCartStore, useAuthStore } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuthStore();
  const { setCart, openCart } = useCartStore();
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productApi.getById(id),
  });

  const { data: reviews } = useQuery({
    queryKey: ['reviews', id],
    queryFn: () => productApi.getReviews(id),
    enabled: !!id,
  });

  const addToCart = useMutation({
    mutationFn: () => cartApi.addItem({ productId: id, quantity: qty }),
    onSuccess: (cart) => { setCart(cart); openCart(); toast.success('Added to cart!'); },
    onError: () => toast.error('Failed to add to cart'),
  });

  const submitReview = useMutation({
    mutationFn: () => productApi.submitReview(id, { rating: reviewRating, comment: reviewText }),
    onSuccess: () => { toast.success('Review submitted!'); setReviewText(''); },
    onError: () => toast.error('Failed to submit review'),
  });

  if (isLoading) return <ProductDetailSkeleton />;
  if (!product) return <div className="text-center py-20">Product not found</div>;

  const images = product.imageUrls.length ? product.imageUrls : ['/placeholder-product.jpg'];
  const discount = product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  return (
    <div className="space-y-12">
      {/* Product detail */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Images */}
        <div className="space-y-3">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted">
            <Image src={images[activeImg]} alt={product.name} fill className="object-cover" />
            {discount && (
              <span className="absolute top-3 left-3 rounded-full bg-destructive px-3 py-1 text-sm font-bold text-white">
                -{discount}%
              </span>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((img, i) => (
                <button key={i} onClick={() => setActiveImg(i)}
                  className={`relative h-16 w-16 shrink-0 rounded-lg overflow-hidden border-2 ${i === activeImg ? 'border-primary' : 'border-transparent'}`}
                >
                  <Image src={img} alt="" fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-4">
          {product.brand && <p className="text-sm text-muted-foreground uppercase tracking-widest">{product.brand}</p>}
          <h1 className="text-2xl md:text-3xl font-bold">{product.name}</h1>

          {/* Rating */}
          <div className="flex items-center gap-2">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-4 w-4 ${i < Math.round(product.averageRating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">{product.averageRating.toFixed(1)} ({product.reviewCount} reviews)</span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold">{formatCurrency(product.price)}</span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-lg text-muted-foreground line-through">{formatCurrency(product.originalPrice)}</span>
            )}
          </div>

          <p className="text-muted-foreground leading-relaxed">{product.description}</p>

          {/* Attributes */}
          {Object.entries(product.attributes).length > 0 && (
            <div className="space-y-1.5">
              {Object.entries(product.attributes).map(([k, v]) => (
                <div key={k} className="flex gap-2 text-sm">
                  <span className="font-medium capitalize w-24 shrink-0">{k}:</span>
                  <span className="text-muted-foreground">{v}</span>
                </div>
              ))}
            </div>
          )}

          {/* Stock */}
          <div className={`text-sm font-medium ${product.inventoryCount > 0 ? 'text-green-600' : 'text-destructive'}`}>
            {product.inventoryCount > 0
              ? product.inventoryCount <= product.lowStockThreshold
                ? `⚠️ Only ${product.inventoryCount} left`
                : '✓ In Stock'
              : '✗ Out of Stock'}
          </div>

          {/* Qty + Add to cart */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border p-1">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-1.5 rounded hover:bg-accent">
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center font-medium">{qty}</span>
              <button onClick={() => setQty(Math.min(product.inventoryCount, qty + 1))} className="p-1.5 rounded hover:bg-accent">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={() => addToCart.mutate()}
              disabled={!product.inStock || addToCart.isPending}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <ShoppingCart className="h-5 w-5" />
              {addToCart.isPending ? 'Adding...' : 'Add to Cart'}
            </button>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Truck className="h-4 w-4" /> Free shipping over $50
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" /> 30-day free returns
            </div>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold">Customer Reviews</h2>
        {reviews?.content.map((r) => (
          <div key={r.reviewId} className="rounded-xl border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{r.userName}</p>
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                  ))}
                </div>
              </div>
              {r.verifiedPurchase && <span className="text-xs text-green-600 font-medium">✓ Verified Purchase</span>}
            </div>
            <p className="text-sm text-muted-foreground">{r.comment}</p>
          </div>
        ))}

        {/* Submit review */}
        {isAuthenticated && (
          <div className="rounded-xl border p-5 space-y-3">
            <h3 className="font-semibold">Write a Review</h3>
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <button key={i} onClick={() => setReviewRating(i + 1)}>
                  <Star className={`h-6 w-6 ${i < reviewRating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                </button>
              ))}
            </div>
            <textarea
              className="w-full rounded-lg border bg-muted p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Share your experience..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
            />
            <button
              onClick={() => submitReview.mutate()}
              disabled={!reviewText.trim() || submitReview.isPending}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {submitReview.isPending ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductDetailSkeleton() {
  return (
    <div className="grid lg:grid-cols-2 gap-8 animate-pulse">
      <div className="aspect-square rounded-2xl bg-muted" />
      <div className="space-y-4">
        <div className="h-6 bg-muted rounded w-1/3" />
        <div className="h-8 bg-muted rounded w-2/3" />
        <div className="h-5 bg-muted rounded w-1/4" />
        <div className="h-10 bg-muted rounded w-1/3" />
        <div className="h-24 bg-muted rounded" />
      </div>
    </div>
  );
}
