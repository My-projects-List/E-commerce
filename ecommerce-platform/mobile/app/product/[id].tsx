import {
  View, Text, ScrollView, Pressable, StyleSheet,
  ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Star, Minus, Plus, ShoppingCart, Heart, Truck, Shield } from 'lucide-react-native';
import { productApi, cartApi } from '@/lib/api';
import { useCartStore, useAuthStore } from '@/lib/store';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { setCart } = useCartStore();
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productApi.getById(id),
  });

  const { data: reviewsData } = useQuery({
    queryKey: ['reviews', id],
    queryFn: () => productApi.getReviews(id),
    enabled: !!id,
  });

  const addToCart = useMutation({
    mutationFn: () => cartApi.addItem({ productId: id, quantity: qty }),
    onSuccess: (cart) => {
      setCart(cart);
      Toast.show({ type: 'success', text1: 'Added to cart!', text2: product?.name });
    },
    onError: () => Toast.show({ type: 'error', text1: 'Failed to add to cart' }),
  });

  if (isLoading) {
    return <ActivityIndicator style={{ flex: 1 }} color="#3b82f6" />;
  }
  if (!product) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>Product not found</Text>
        <Pressable onPress={() => router.back()}><Text style={s.link}>Go back</Text></Pressable>
      </View>
    );
  }

  const images = product.imageUrls.length ? product.imageUrls : ['https://via.placeholder.com/400'];
  const discount = product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Image carousel */}
        <View style={{ backgroundColor: '#fff' }}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setActiveImg(Math.round(e.nativeEvent.contentOffset.x / width))}>
            {images.map((uri, i) => (
              <Image key={i} source={{ uri }} style={{ width, height: 320 }} contentFit="cover" />
            ))}
          </ScrollView>
          {/* Dots */}
          {images.length > 1 && (
            <View style={s.dots}>
              {images.map((_, i) => (
                <View key={i} style={[s.dot, i === activeImg && s.dotActive]} />
              ))}
            </View>
          )}
          {discount && (
            <View style={s.discountBadge}>
              <Text style={s.discountText}>-{discount}%</Text>
            </View>
          )}
        </View>

        <View style={s.content}>
          {/* Brand + Name */}
          {product.brand && <Text style={s.brand}>{product.brand.toUpperCase()}</Text>}
          <Text style={s.name}>{product.name}</Text>

          {/* Rating */}
          <View style={s.ratingRow}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={16}
                color={i < Math.round(product.averageRating) ? '#f59e0b' : '#d1d5db'}
                fill={i < Math.round(product.averageRating) ? '#f59e0b' : 'transparent'} />
            ))}
            <Text style={s.ratingText}>
              {product.averageRating.toFixed(1)} ({product.reviewCount} reviews)
            </Text>
          </View>

          {/* Price */}
          <View style={s.priceRow}>
            <Text style={s.price}>${product.price.toFixed(2)}</Text>
            {product.originalPrice && product.originalPrice > product.price && (
              <Text style={s.originalPrice}>${product.originalPrice.toFixed(2)}</Text>
            )}
          </View>

          {/* Stock */}
          <Text style={product.inStock ? s.inStock : s.outOfStock}>
            {product.inStock
              ? product.inventoryCount <= product.lowStockThreshold
                ? `⚠ Only ${product.inventoryCount} left`
                : '✓ In Stock'
              : '✗ Out of Stock'}
          </Text>

          {/* Description */}
          <Text style={s.sectionTitle}>Description</Text>
          <Text style={s.description}>{product.description}</Text>

          {/* Attributes */}
          {Object.entries(product.attributes).length > 0 && (
            <>
              <Text style={s.sectionTitle}>Specifications</Text>
              <View style={s.attrTable}>
                {Object.entries(product.attributes).map(([k, v]) => (
                  <View key={k} style={s.attrRow}>
                    <Text style={s.attrKey}>{k}</Text>
                    <Text style={s.attrVal}>{v}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Trust badges */}
          <View style={s.badges}>
            <View style={s.badge}>
              <Truck size={16} color="#3b82f6" />
              <Text style={s.badgeText}>Free shipping over $50</Text>
            </View>
            <View style={s.badge}>
              <Shield size={16} color="#3b82f6" />
              <Text style={s.badgeText}>30-day returns</Text>
            </View>
          </View>

          {/* Reviews */}
          {(reviewsData?.content ?? []).length > 0 && (
            <>
              <Text style={s.sectionTitle}>Reviews</Text>
              {reviewsData!.content.slice(0, 3).map((r) => (
                <View key={r.reviewId} style={s.reviewCard}>
                  <View style={s.reviewHeader}>
                    <Text style={s.reviewUser}>{r.userName}</Text>
                    <View style={{ flexDirection: 'row', gap: 2 }}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={12}
                          color={i < r.rating ? '#f59e0b' : '#d1d5db'}
                          fill={i < r.rating ? '#f59e0b' : 'transparent'} />
                      ))}
                    </View>
                  </View>
                  <Text style={s.reviewComment}>{r.comment}</Text>
                  {r.verifiedPurchase && <Text style={s.verified}>✓ Verified Purchase</Text>}
                </View>
              ))}
            </>
          )}
        </View>
      </ScrollView>

      {/* Sticky Add-to-Cart bar */}
      <View style={s.stickyBar}>
        <View style={s.qtyControl}>
          <Pressable style={s.qtyBtn} onPress={() => setQty(Math.max(1, qty - 1))}>
            <Minus size={16} color="#374151" />
          </Pressable>
          <Text style={s.qtyNum}>{qty}</Text>
          <Pressable style={s.qtyBtn}
            onPress={() => setQty(Math.min(product.inventoryCount, qty + 1))}>
            <Plus size={16} color="#374151" />
          </Pressable>
        </View>
        <Pressable
          style={[s.cartBtn, (!product.inStock || addToCart.isPending) && s.cartBtnDisabled]}
          disabled={!product.inStock || addToCart.isPending}
          onPress={() => addToCart.mutate()}
        >
          <ShoppingCart size={18} color="#fff" />
          <Text style={s.cartBtnText}>
            {addToCart.isPending ? 'Adding…' : 'Add to Cart'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  errorText:      { fontSize: 16, color: '#6b7280' },
  link:           { color: '#3b82f6', fontSize: 14 },
  dots:           { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  dot:            { width: 6, height: 6, borderRadius: 3, backgroundColor: '#d1d5db' },
  dotActive:      { backgroundColor: '#3b82f6', width: 18 },
  discountBadge:  { position: 'absolute', top: 12, left: 12, backgroundColor: '#ef4444', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  discountText:   { color: '#fff', fontWeight: '700', fontSize: 12 },
  content:        { padding: 16, gap: 10 },
  brand:          { fontSize: 11, color: '#6b7280', letterSpacing: 1.5, fontWeight: '600' },
  name:           { fontSize: 22, fontWeight: '700', color: '#111827', lineHeight: 28 },
  ratingRow:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText:     { fontSize: 13, color: '#6b7280', marginLeft: 4 },
  priceRow:       { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  price:          { fontSize: 28, fontWeight: '800', color: '#1d4ed8' },
  originalPrice:  { fontSize: 16, color: '#9ca3af', textDecorationLine: 'line-through' },
  inStock:        { fontSize: 13, color: '#16a34a', fontWeight: '500' },
  outOfStock:     { fontSize: 13, color: '#ef4444', fontWeight: '500' },
  sectionTitle:   { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 8 },
  description:    { fontSize: 14, color: '#4b5563', lineHeight: 22 },
  attrTable:      { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' },
  attrRow:        { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  attrKey:        { width: 120, fontSize: 13, fontWeight: '600', color: '#374151', textTransform: 'capitalize' },
  attrVal:        { flex: 1, fontSize: 13, color: '#6b7280' },
  badges:         { flexDirection: 'row', gap: 10 },
  badge:          { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#eff6ff', borderRadius: 8, padding: 10 },
  badgeText:      { fontSize: 12, color: '#1d4ed8', fontWeight: '500', flex: 1 },
  reviewCard:     { backgroundColor: '#fff', borderRadius: 10, padding: 12, gap: 6, borderWidth: 1, borderColor: '#e5e7eb' },
  reviewHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewUser:     { fontSize: 14, fontWeight: '600', color: '#111827' },
  reviewComment:  { fontSize: 13, color: '#4b5563', lineHeight: 20 },
  verified:       { fontSize: 11, color: '#16a34a', fontWeight: '500' },
  stickyBar:      { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 10, padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#e5e7eb' },
  qtyControl:     { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  qtyBtn:         { padding: 4 },
  qtyNum:         { fontSize: 17, fontWeight: '700', minWidth: 24, textAlign: 'center' },
  cartBtn:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#3b82f6', borderRadius: 14, paddingVertical: 14 },
  cartBtnDisabled:{ opacity: 0.5 },
  cartBtnText:    { color: '#fff', fontSize: 16, fontWeight: '700' },
});
