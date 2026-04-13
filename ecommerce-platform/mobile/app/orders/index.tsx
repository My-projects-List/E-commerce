import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Package, ChevronRight } from 'lucide-react-native';
import { orderApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

const STATUS_COLOR: Record<string, string> = {
  CREATED: '#6b7280', CONFIRMED: '#3b82f6', PAYMENT_FAILED: '#ef4444',
  PROCESSING: '#f59e0b', SHIPPED: '#8b5cf6', DELIVERED: '#16a34a',
  CANCELLED: '#ef4444', REFUNDED: '#a855f7',
};

export default function OrdersScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => orderApi.list(),
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <View style={s.center}>
        <Text style={s.emptyText}>Sign in to see your orders</Text>
        <Pressable style={s.btn} onPress={() => router.push('/auth/login')}>
          <Text style={s.btnText}>Sign In</Text>
        </Pressable>
      </View>
    );
  }

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} color="#3b82f6" />;

  const orders = data?.content ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <Text style={s.header}>My Orders</Text>
      {orders.length === 0 ? (
        <View style={s.center}>
          <Package size={48} color="#d1d5db" />
          <Text style={s.emptyText}>No orders yet</Text>
          <Pressable style={s.btn} onPress={() => router.push('/(tabs)/index')}>
            <Text style={s.btnText}>Start Shopping</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.orderId}
          contentContainerStyle={{ padding: 14, gap: 10 }}
          renderItem={({ item }) => (
            <Pressable style={s.card} onPress={() => router.push(`/orders/${item.orderId}` as any)}>
              <View style={{ flex: 1 }}>
                <View style={s.row}>
                  <Text style={s.orderId}>#{item.orderId.slice(0, 8).toUpperCase()}</Text>
                  <View style={[s.badge, { backgroundColor: (STATUS_COLOR[item.status] ?? '#6b7280') + '20' }]}>
                    <Text style={[s.badgeText, { color: STATUS_COLOR[item.status] ?? '#6b7280' }]}>
                      {item.status.replace(/_/g, ' ')}
                    </Text>
                  </View>
                </View>
                <Text style={s.gray}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                <Text style={s.gray}>{item.items.length} item{item.items.length !== 1 ? 's' : ''}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={s.total}>${item.totalPrice.toFixed(2)}</Text>
                <ChevronRight size={16} color="#9ca3af" />
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  header:    { fontSize: 22, fontWeight: '700', padding: 16, paddingBottom: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e5e7eb' },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  emptyText: { fontSize: 15, color: '#6b7280' },
  btn:       { backgroundColor: '#3b82f6', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  btnText:   { color: '#fff', fontWeight: '600' },
  card:      { backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  row:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderId:   { fontSize: 14, fontWeight: '700', color: '#111827' },
  badge:     { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  gray:      { fontSize: 13, color: '#6b7280', marginTop: 2 },
  total:     { fontSize: 16, fontWeight: '800', color: '#111827' },
});
