import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { CheckCircle, XCircle, Package, Truck } from 'lucide-react-native';
import { orderApi } from '@/lib/api';
import Toast from 'react-native-toast-message';

const STATUS_STEPS = ['CREATED', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

const STATUS_COLORS: Record<string, string> = {
  CREATED:        '#6b7280',
  CONFIRMED:      '#3b82f6',
  PAYMENT_FAILED: '#ef4444',
  PROCESSING:     '#f59e0b',
  SHIPPED:        '#8b5cf6',
  DELIVERED:      '#16a34a',
  CANCELLED:      '#ef4444',
  REFUNDED:       '#a855f7',
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: order, isLoading, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: () => orderApi.getById(id),
    refetchInterval: 30_000,
  });

  const cancelOrder = useMutation({
    mutationFn: () => orderApi.cancel(id),
    onSuccess: () => { Toast.show({ type: 'success', text1: 'Order cancelled' }); refetch(); },
    onError: () => Toast.show({ type: 'error', text1: 'Cannot cancel this order' }),
  });

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} color="#3b82f6" />;
  if (!order)   return <View style={s.center}><Text style={s.gray}>Order not found</Text></View>;

  const currentStep = STATUS_STEPS.indexOf(order.status);
  const statusColor = STATUS_COLORS[order.status] ?? '#6b7280';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f9fafb' }} contentContainerStyle={{ padding: 16, gap: 14 }}>
      {/* Header */}
      <View style={s.headerCard}>
        <View style={{ flex: 1 }}>
          <Text style={s.orderId}>Order #{order.orderId.slice(0, 8).toUpperCase()}</Text>
          <Text style={s.gray}>{new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</Text>
        </View>
        <View style={[s.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[s.statusText, { color: statusColor }]}>{order.status.replace(/_/g, ' ')}</Text>
        </View>
      </View>

      {/* Progress */}
      {currentStep >= 0 && (
        <View style={s.card}>
          <View style={s.progressRow}>
            {STATUS_STEPS.map((step, i) => (
              <View key={step} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                {i > 0 && <View style={[s.progressLine, i <= currentStep && s.progressLineActive]} />}
                <View style={[s.progressDot, i <= currentStep && s.progressDotActive]}>
                  {i < currentStep
                    ? <CheckCircle size={14} color="#fff" />
                    : <Text style={[s.progressNum, i <= currentStep && { color: '#fff' }]}>{i + 1}</Text>}
                </View>
                <Text style={[s.progressLabel, i <= currentStep && s.progressLabelActive]} numberOfLines={1}>
                  {step.charAt(0) + step.slice(1).toLowerCase()}
                </Text>
              </View>
            ))}
          </View>
          {order.trackingNumber && (
            <View style={s.trackingRow}>
              <Truck size={14} color="#3b82f6" />
              <Text style={s.trackingText}>Tracking: {order.trackingNumber}</Text>
            </View>
          )}
        </View>
      )}

      {/* Items */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Items</Text>
        {order.items.map((item) => (
          <View key={item.orderItemId} style={s.itemRow}>
            <Image source={{ uri: item.imageUrl || 'https://via.placeholder.com/64' }}
              style={s.itemImg} contentFit="cover" />
            <View style={{ flex: 1 }}>
              <Text style={s.itemName} numberOfLines={2}>{item.productName}</Text>
              <Text style={s.gray}>SKU: {item.sku}</Text>
              <Text style={s.gray}>× {item.quantity}</Text>
            </View>
            <Text style={s.itemTotal}>${item.lineTotal.toFixed(2)}</Text>
          </View>
        ))}
      </View>

      {/* Totals */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Payment Summary</Text>
        <View style={s.totalRow}><Text style={s.gray}>Subtotal</Text><Text>${order.subtotal.toFixed(2)}</Text></View>
        <View style={s.totalRow}><Text style={s.gray}>Shipping</Text><Text>${order.shippingCost.toFixed(2)}</Text></View>
        {order.discountAmount > 0 && (
          <View style={s.totalRow}>
            <Text style={{ color: '#16a34a' }}>Discount</Text>
            <Text style={{ color: '#16a34a' }}>-${order.discountAmount.toFixed(2)}</Text>
          </View>
        )}
        <View style={[s.totalRow, s.grandTotal]}>
          <Text style={s.grandTotalLabel}>Total</Text>
          <Text style={s.grandTotalValue}>${order.totalPrice.toFixed(2)}</Text>
        </View>
      </View>

      {/* Shipping address */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Shipping To</Text>
        <Text style={s.bold}>{order.shippingAddress.fullName}</Text>
        <Text style={s.gray}>{order.shippingAddress.street}</Text>
        <Text style={s.gray}>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}</Text>
      </View>

      {/* Cancel */}
      {['CREATED', 'CONFIRMED'].includes(order.status) && (
        <Pressable
          style={[s.cancelBtn, cancelOrder.isPending && { opacity: 0.5 }]}
          disabled={cancelOrder.isPending}
          onPress={() => cancelOrder.mutate()}
        >
          <XCircle size={16} color="#ef4444" />
          <Text style={s.cancelText}>{cancelOrder.isPending ? 'Cancelling…' : 'Cancel Order'}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  center:               { flex: 1, alignItems: 'center', justifyContent: 'center' },
  gray:                 { fontSize: 13, color: '#6b7280' },
  bold:                 { fontSize: 14, fontWeight: '600', color: '#111827' },
  headerCard:           { backgroundColor: '#fff', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  orderId:              { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 2 },
  statusBadge:          { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  statusText:           { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  card:                 { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  sectionTitle:         { fontSize: 15, fontWeight: '700', color: '#111827' },
  progressRow:          { flexDirection: 'row', alignItems: 'flex-start', position: 'relative' },
  progressLine:         { position: 'absolute', top: 14, left: '50%', right: '-50%', height: 2, backgroundColor: '#e5e7eb', zIndex: 0 },
  progressLineActive:   { backgroundColor: '#3b82f6' },
  progressDot:          { width: 28, height: 28, borderRadius: 14, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  progressDotActive:    { backgroundColor: '#3b82f6' },
  progressNum:          { fontSize: 12, fontWeight: '700', color: '#9ca3af' },
  progressLabel:        { fontSize: 10, color: '#9ca3af', textAlign: 'center' },
  progressLabelActive:  { color: '#3b82f6', fontWeight: '600' },
  trackingRow:          { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#eff6ff', padding: 10, borderRadius: 8, marginTop: 4 },
  trackingText:         { fontSize: 13, color: '#1d4ed8', fontWeight: '500' },
  itemRow:              { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  itemImg:              { width: 60, height: 60, borderRadius: 8 },
  itemName:             { fontSize: 14, fontWeight: '500', color: '#111827', flex: 1 },
  itemTotal:            { fontSize: 14, fontWeight: '700', color: '#111827' },
  totalRow:             { flexDirection: 'row', justifyContent: 'space-between' },
  grandTotal:           { borderTopWidth: 1, borderColor: '#e5e7eb', paddingTop: 10, marginTop: 2 },
  grandTotalLabel:      { fontSize: 15, fontWeight: '700' },
  grandTotalValue:      { fontSize: 17, fontWeight: '800', color: '#1d4ed8' },
  cancelBtn:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#fecaca', borderRadius: 12, paddingVertical: 13, backgroundColor: '#fff' },
  cancelText:           { color: '#ef4444', fontWeight: '600', fontSize: 15 },
});
