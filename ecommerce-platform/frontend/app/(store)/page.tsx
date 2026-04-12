import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowRight, Star, Zap, Shield, Truck } from 'lucide-react';
import { FeaturedProducts } from '@/components/store/FeaturedProducts';

export const metadata: Metadata = { title: 'Home — ShopNow' };

const FEATURES = [
  { icon: Truck,   title: 'Free Shipping',    desc: 'On orders over $50' },
  { icon: Shield,  title: 'Secure Payment',   desc: 'SSL encrypted checkout' },
  { icon: Zap,     title: 'Fast Delivery',    desc: '2-3 business days' },
  { icon: Star,    title: 'Quality Products', desc: 'Curated & reviewed' },
];

const CATEGORIES = [
  { name: 'Electronics',       emoji: '📱', href: '/products?categoryId=electronics' },
  { name: 'Clothing',          emoji: '👕', href: '/products?categoryId=clothing' },
  { name: 'Home & Garden',     emoji: '🏡', href: '/products?categoryId=home' },
  { name: 'Sports & Outdoors', emoji: '⚽', href: '/products?categoryId=sports' },
  { name: 'Books',             emoji: '📚', href: '/products?categoryId=books' },
];

export default function HomePage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="relative rounded-2xl bg-gradient-to-br from-primary to-blue-700 text-white p-10 md:p-16 overflow-hidden">
        <div className="relative z-10 max-w-xl space-y-5">
          <span className="inline-block rounded-full bg-white/20 px-4 py-1 text-sm font-medium backdrop-blur">
            🎉 Summer Sale — Up to 50% off
          </span>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            Shop Smarter,<br />Live Better
          </h1>
          <p className="text-lg text-blue-100">
            Discover thousands of products curated just for you. Fast delivery, easy returns.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-xl bg-white text-primary px-6 py-3 font-semibold hover:bg-blue-50 transition-colors"
            >
              Shop Now <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/products?sort=averageRating,desc"
              className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-6 py-3 font-medium hover:bg-white/10 transition-colors"
            >
              Top Rated
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Bar */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="flex items-center gap-3 rounded-xl border p-4">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <f.icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">{f.title}</p>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Categories */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Shop by Category</h2>
          <Link href="/products" className="text-sm text-primary hover:underline flex items-center gap-1">
            All products <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.name}
              href={cat.href}
              className="snap-start shrink-0 flex flex-col items-center gap-2 rounded-xl border bg-card p-5 w-32 hover:border-primary hover:shadow-sm transition-all"
            >
              <span className="text-3xl">{cat.emoji}</span>
              <span className="text-xs font-medium text-center">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Featured Products</h2>
          <Link href="/products" className="text-sm text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <Suspense fallback={<ProductGridSkeleton />}>
          <FeaturedProducts />
        </Suspense>
      </section>
    </div>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card animate-pulse">
          <div className="aspect-square rounded-t-xl bg-muted" />
          <div className="p-3 space-y-2">
            <div className="h-3 bg-muted rounded w-2/3" />
            <div className="h-4 bg-muted rounded" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
