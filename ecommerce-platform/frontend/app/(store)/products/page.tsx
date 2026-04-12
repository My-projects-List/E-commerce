'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { SlidersHorizontal, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { productApi } from '@/lib/api';
import { ProductCard } from '@/components/store/ProductCard';
import type { ProductFilters } from '../../../../shared/types';

const SORT_OPTIONS = [
  { label: 'Relevance',      value: 'createdAt,desc' },
  { label: 'Price: Low → High', value: 'price,asc' },
  { label: 'Price: High → Low', value: 'price,desc' },
  { label: 'Top Rated',     value: 'averageRating,desc' },
  { label: 'Most Reviews',  value: 'reviewCount,desc' },
];

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [filters, setFilters] = useState<ProductFilters>({
    categoryId: searchParams.get('categoryId') ?? undefined,
    minPrice: undefined,
    maxPrice: undefined,
    minRating: undefined,
    brand: undefined,
    query: searchParams.get('q') ?? undefined,
    page: 0,
    size: 20,
    sort: 'createdAt,desc',
  });
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['products', filters],
    queryFn: () => productApi.list(filters),
  });

  const setPage = (p: number) => setFilters((f) => ({ ...f, page: p }));
  const setSort  = (sort: string) => setFilters((f) => ({ ...f, sort, page: 0 }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          {data && (
            <p className="text-sm text-muted-foreground mt-1">
              {data.totalElements.toLocaleString()} results
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            className="rounded-lg border bg-background px-3 py-2 text-sm"
            value={filters.sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm hover:bg-accent"
          >
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Filter panel */}
        {showFilters && (
          <aside className="w-56 shrink-0 space-y-5">
            <div>
              <h3 className="font-medium mb-2 text-sm">Price Range</h3>
              <div className="flex gap-2">
                <input
                  type="number" placeholder="Min"
                  className="w-full rounded border px-2 py-1.5 text-sm"
                  value={filters.minPrice ?? ''}
                  onChange={(e) => setFilters((f) => ({ ...f, minPrice: +e.target.value || undefined, page: 0 }))}
                />
                <input
                  type="number" placeholder="Max"
                  className="w-full rounded border px-2 py-1.5 text-sm"
                  value={filters.maxPrice ?? ''}
                  onChange={(e) => setFilters((f) => ({ ...f, maxPrice: +e.target.value || undefined, page: 0 }))}
                />
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-2 text-sm">Min Rating</h3>
              {[4, 3, 2, 1].map((r) => (
                <label key={r} className="flex items-center gap-2 py-1 cursor-pointer text-sm">
                  <input
                    type="radio" name="rating"
                    checked={filters.minRating === r}
                    onChange={() => setFilters((f) => ({ ...f, minRating: r, page: 0 }))}
                  />
                  {'★'.repeat(r)} & up
                </label>
              ))}
            </div>
            <button
              onClick={() => setFilters({ page: 0, size: 20, sort: 'createdAt,desc' })}
              className="text-sm text-primary hover:underline"
            >
              Clear all filters
            </button>
          </aside>
        )}

        {/* Grid */}
        <div className="flex-1">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="rounded-xl border animate-pulse">
                  <div className="aspect-square bg-muted rounded-t-xl" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-muted rounded w-2/3" />
                    <div className="h-4 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : !data?.content.length ? (
            <div className="flex flex-col items-center py-20 text-muted-foreground">
              <Search className="h-12 w-12 mb-3 opacity-30" />
              <p className="font-medium">No products found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {data.content.map((p) => <ProductCard key={p.productId} product={p} />)}
              </div>

              {/* Pagination */}
              {!data.last && (
                <div className="flex items-center justify-center gap-3 mt-8">
                  <button
                    onClick={() => setPage((filters.page ?? 0) - 1)}
                    disabled={data.first}
                    className="rounded-lg border p-2 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-muted-foreground">
                    Page {data.number + 1} of {data.totalPages}
                  </span>
                  <button
                    onClick={() => setPage((filters.page ?? 0) + 1)}
                    disabled={data.last}
                    className="rounded-lg border p-2 disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
