'use client';
import { useQuery } from '@tanstack/react-query';
import { productApi } from '@/lib/api';
import { ProductCard } from './ProductCard';

export function FeaturedProducts() {
  const { data, isLoading } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: () => productApi.list({ sort: 'averageRating,desc', size: 8 }),
  });

  if (isLoading) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {data?.content.map((p) => <ProductCard key={p.productId} product={p} />)}
    </div>
  );
}
