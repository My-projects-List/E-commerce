'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Percent, AlertTriangle } from 'lucide-react';
import { productApi, adminApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function AdminProductsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [discountModal, setDiscountModal] = useState<{ productId: string; name: string } | null>(null);
  const [discountPct, setDiscountPct] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', page, search],
    queryFn: () => productApi.list({ page, size: 20, query: search || undefined }),
  });

  const applyDiscount = useMutation({
    mutationFn: ({ productId, pct }: { productId: string; pct: number }) =>
      adminApi.applyDiscount({ productId, discountPercent: pct }),
    onSuccess: () => {
      toast.success('Discount applied!');
      setDiscountModal(null);
      qc.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: () => toast.error('Failed to apply discount'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Search products..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Product</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Category</th>
              <th className="text-left px-4 py-3 font-medium">Price</th>
              <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Stock</th>
              <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Rating</th>
              <th className="text-left px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td></tr>
              ))
            ) : data?.content.map((product) => (
              <tr key={product.productId} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium line-clamp-1">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.brand}</p>
                  </div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{product.categoryName}</td>
                <td className="px-4 py-3 font-medium">{formatCurrency(product.price)}</td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className={`font-medium ${!product.inStock ? 'text-destructive' : ''}`}>
                    {product.inStock ? 'In Stock' : 'Out of Stock'}
                  </span>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  ⭐ {product.averageRating.toFixed(1)} ({product.reviewCount})
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setDiscountModal({ productId: product.productId, name: product.name })}
                    className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs hover:bg-accent"
                  >
                    <Percent className="h-3 w-3" /> Discount
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && !data.last && (
        <div className="flex justify-center gap-2 text-sm">
          <button onClick={() => setPage(p => p - 1)} disabled={data.first} className="px-3 py-1.5 rounded border disabled:opacity-40">Prev</button>
          <span className="px-3 py-1.5">Page {data.number + 1} of {data.totalPages}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={data.last} className="px-3 py-1.5 rounded border disabled:opacity-40">Next</button>
        </div>
      )}

      {/* Discount modal */}
      {discountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-card border p-6 space-y-4 shadow-xl">
            <h3 className="font-semibold">Apply Discount</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">{discountModal.name}</p>
            <div className="flex gap-2 items-center">
              <input
                type="number" min="1" max="90" placeholder="e.g. 20"
                className="flex-1 rounded-lg border px-3 py-2 text-sm"
                value={discountPct}
                onChange={(e) => setDiscountPct(e.target.value)}
              />
              <span className="text-sm font-medium">%</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDiscountModal(null)} className="flex-1 rounded-lg border py-2 text-sm">Cancel</button>
              <button
                onClick={() => applyDiscount.mutate({ productId: discountModal.productId, pct: +discountPct })}
                disabled={!discountPct || applyDiscount.isPending}
                className="flex-1 rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {applyDiscount.isPending ? 'Applying…' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
