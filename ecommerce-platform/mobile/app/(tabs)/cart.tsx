import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { cartApi } from '@/lib/api';
import { useCartStore, useAuthStore } from '@/lib/store';
import Toast from 'react-native-toast-message';

export default function CartScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { cart, setCart } = useCartStore();

  const { isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => { const c = await cartApi.get(); setCart(c); return c; },
    enabled: isAuthenticated,
  });

  const updateQty = useMutation({
    mutationFn: ({ productId, qty }: { productId: string; qty: number }) => cartApi.updateQuantity(productId, qty),
    onSuccess: setCart,
  });

  const removeItem = useMutation({
    mutationFn: (productId: string) => cartApi.removeItem(productId),
    onSuccess: setCart,
    onError: () => Toast.show({ type: 'error', text1: 'Failed to remove item' }),
  });

  if (!isAuthenticated) {
    return (
      <View style={s.center}>
        <Text style={s.emptyText}>Sign in to view your cart</Text>
        <Pressable style={s.btn} onPress={() => router.push('/auth/login')}>
          <Text style={s.btnText}>Sign In</Text>
        </Pressable>
      </View>
    );
  }

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} color="#3b82f6" />;

  const items = cart?.items ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <Text style={s.header}>My Cart ({cart?.itemCount ?? 0})</Text>

      {items.length === 0 ? (
        <View style={s.center}>
          <Text style={s.emptyEmoji}>🛒</Text>
          <Text style={s.emptyText}>Your cart is empty</Text>
          <Pressable style={s.btn} onPress={() => router.push('/(tabs)/index')}>
            <Text style={s.btnText}>Start Shopping</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
            {items.map((item) => (
              <View key={item.productId} style={s.card}>
                <Image source={{ uri: item.imageUrl || 'https://via.placeholder.com/80' }}
                  style={s.itemImg} contentFit="cover" />
                <View style={{ flex: 1 }}>
                  <Text style={s.itemName} numberOfLines={2}>{item.name}</Text>
                  <Text style={s.itemPrice}>${item.price.toFixed(2)}</Text>
                  <View style={s.qtyRow}>
                    <Pressable style={s.qtyBtn}
                      onPress={() => updateQty.mutate({ productId: item.productId, qty: item.quantity - 1 })}
                      disabled={item.quantity <= 1}>
                      <Text style={s.qtyBtnText}>−</Text>
                    </Pressable>
                    <Text style={s.qty}>{item.quantity}</Text>
                    <Pressable style={s.qtyBtn}
                      onPress={() => updateQty.mutate({ productId: item.productId, qty: item.quantity + 1 })}>
                      <Text style={s.qtyBtnText}>+</Text>
                    </Pressable>
                    <Pressable style={s.removeBtn}
                      onPress={() => removeItem.mutate(item.productId)}>
                      <Text style={{ color: '#ef4444', fontSize: 12 }}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={s.footer}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Subtotal</Text>
              <Text style={s.totalValue}>${cart?.subtotal.toFixed(2)}</Text>
            </View>
            <Pressable style={s.checkoutBtn} onPress={() => router.push('/checkout')}>
              <Text style={s.checkoutText}>Checkout</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  header:       { fontSize: 22, fontWeight: '700', padding: 16, paddingBottom: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e5e7eb' },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  emptyEmoji:   { fontSize: 48 },
  emptyText:    { fontSize: 16, color: '#6b7280' },
  btn:          { backgroundColor: '#3b82f6', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  btnText:      { color: '#fff', fontWeight: '600', fontSize: 15 },
  card:         { backgroundColor: '#fff', borderRadius: 12, padding: 12, flexDirection: 'row', gap: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  itemImg:      { width: 72, height: 72, borderRadius: 8 },
  itemName:     { fontSize: 14, fontWeight: '500', color: '#111827' },
  itemPrice:    { fontSize: 15, fontWeight: '700', color: '#1d4ed8', marginTop: 2 },
  qtyRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  qtyBtn:       { width: 28, height: 28, borderRadius: 6, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center' },
  qtyBtnText:   { fontSize: 16, fontWeight: '500' },
  qty:          { fontSize: 15, fontWeight: '600', minWidth: 24, textAlign: 'center' },
  removeBtn:    { marginLeft: 'auto', padding: 4 },
  footer:       { backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#e5e7eb', padding: 16, gap: 12 },
  totalRow:     { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel:   { fontSize: 16, fontWeight: '600' },
  totalValue:   { fontSize: 18, fontWeight: '700' },
  checkoutBtn:  { backgroundColor: '#3b82f6', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  checkoutText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
