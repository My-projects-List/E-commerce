'use client';
import Image from 'next/image';
import Link from 'next/link';
import { Star, ShoppingCart, Heart } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cartApi, userApi } from '@/lib/api';
import { useAuthStore, useCartStore } from '@/lib/store';
import { formatCurrency, getDiscountedPrice } from '@/lib/utils';
import type { ProductSummary } from '../../../shared/types';
import toast from 'react-hot-toast';

interface ProductCardProps {
  product: ProductSummary;
}

export function ProductCard({ product }: ProductCardProps) {
  const qc = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const { setCart, openCart } = useCartStore();
  const discount = getDiscountedPrice(product.price, product.originalPrice);

  const addToCart = useMutation({
    mutationFn: () => cartApi.addItem({ productId: product.productId, quantity: 1 }),
    onSuccess: (cart) => {
      setCart(cart);
      openCart();
      toast.success(`${product.name} added to cart`);
    },
    onError: () => toast.error('Failed to add to cart'),
  });

  const addToWishlist = useMutation({
    mutationFn: () => userApi.addToWishlist(product.productId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wishlist'] });
      toast.success('Added to wishlist');
    },
  });

  return (
    <div className="group relative rounded-xl border bg-card hover:shadow-md transition-shadow duration-200">
      {/* Discount badge */}
      {discount && (
        <span className="absolute top-2 left-2 z-10 rounded-full bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground">
          -{discount}%
        </span>
      )}

      {/* Wishlist */}
      {isAuthenticated && (
        <button
          onClick={() => addToWishlist.mutate()}
          className="absolute top-2 right-2 z-10 rounded-full bg-background/80 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Heart className="h-4 w-4" />
        </button>
      )}

      {/* Image */}
      <Link href={`/products/${product.productId}`}>
        <div className="relative aspect-square overflow-hidden rounded-t-xl bg-muted">
          <Image
            src={product.imageUrl || '/placeholder-product.jpg'}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
          {!product.inStock && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
              <span className="text-sm font-medium text-muted-foreground">Out of stock</span>
            </div>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="p-3 space-y-1.5">
        {product.brand && (
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{product.brand}</p>
        )}
        <Link href={`/products/${product.productId}`}>
          <h3 className="text-sm font-medium line-clamp-2 hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        <div className="flex items-center gap-1">
          <div className="flex">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-3 w-3 ${i < Math.round(product.averageRating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">({product.reviewCount})</span>
        </div>

        {/* Price + Cart */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold">{formatCurrency(product.price)}</span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-xs text-muted-foreground line-through">
                {formatCurrency(product.originalPrice)}
              </span>
            )}
          </div>
          <button
            onClick={() => addToCart.mutate()}
            disabled={!product.inStock || addToCart.isPending}
            className="rounded-lg bg-primary p-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ShoppingCart className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
