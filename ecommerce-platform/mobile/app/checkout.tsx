import {
  View, Text, ScrollView, Pressable, StyleSheet,
  TextInput, ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { MapPin, CreditCard, Lock, ChevronRight } from 'lucide-react-native';
import { userApi, orderApi, cartApi } from '@/lib/api';
import { useCartStore } from '@/lib/store';
import Toast from 'react-native-toast-message';
import type { Address } from '../../../shared/types';

type Step = 'address' | 'payment' | 'review';

function generateKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function CheckoutScreen() {
  const router = useRouter();
  const { cart, setCart } = useCartStore();
  const [step, setStep]               = useState<Step>('address');
  const [selectedAddr, setSelectedAddr] = useState<string>('');
  const [paymentMethodId, setPayment]   = useState('');
  const [coupon, setCoupon]             = useState('');

  const { data: addresses = [], isLoading: addrLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: userApi.getAddresses,
  });

  const placeOrder = useMutation({
    mutationFn: () =>
      orderApi.checkout({
        idempotencyKey: generateKey(),
        shippingAddressId: selectedAddr,
        paymentMethodId,
        couponCode: coupon || undefined,
      }),
    onSuccess: async (order) => {
      await cartApi.clear().catch(() => {});
      setCart(null);
      Toast.show({ type: 'success', text1: 'Order placed!', text2: `Order #${order.orderId.slice(0, 8)}` });
      router.replace(`/orders/${order.orderId}` as any);
    },
    onError: (err: any) => {
      Toast.show({ type: 'error', text1: err.response?.data?.message ?? 'Order failed' });
    },
  });

  const shipping = (cart?.subtotal ?? 0) >= 50 ? 0 : 4.99;
  const total = Math.max(0, (cart?.subtotal ?? 0) - (cart?.discountAmount ?? 0) + shipping);

  if (!cart?.items.length) {
    return (
      <View style={s.center}>
        <Text style={s.emptyText}>Your cart is empty</Text>
        <Pressable style={s.btn} onPress={() => router.replace('/(tabs)/index')}>
          <Text style={s.btnText}>Shop Now</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Step tabs */}
      <View style={s.steps}>
        {(['address', 'payment', 'review'] as Step[]).map((s_, i) => (
          <View key={s_} style={{ flexDirection: 'row', alignItems: 'center' }}>
            {i > 0 && <View style={{ width: 20, height: 1, backgroundColor: '#d1d5db' }} />}
            <Pressable onPress={() => step !== 'review' && setStep(s_)}>
              <Text style={[stepS.label, step === s_ && stepS.labelActive]}>
                {i + 1}. {s_.charAt(0).toUpperCase() + s_.slice(1)}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}>
        {/* ── Address step ── */}
        {step === 'address' && (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <MapPin size={18} color="#3b82f6" />
              <Text style={s.cardTitle}>Shipping Address</Text>
            </View>
            {addrLoading ? <ActivityIndicator color="#3b82f6" /> : (
              addresses.length === 0 ? (
                <Text style={s.emptyText}>No saved addresses. Add one in your profile.</Text>
              ) : (
                addresses.map((addr: Address) => (
                  <Pressable key={addr.addressId}
                    style={[s.addrCard, selectedAddr === addr.addressId && s.addrCardActive]}
                    onPress={() => setSelectedAddr(addr.addressId)}
                  >
                    <View style={[s.radio, selectedAddr === addr.addressId && s.radioActive]} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.addrName}>{addr.fullName}
                        {addr.isDefault && <Text style={s.defaultBadge}> Default</Text>}
                      </Text>
                      <Text style={s.addrLine}>{addr.street}</Text>
                      <Text style={s.addrLine}>{addr.city}, {addr.state} {addr.zipCode}</Text>
                    </View>
                  </Pressable>
                ))
              )
            )}
            <Pressable
              style={[s.nextBtn, !selectedAddr && s.nextBtnDisabled]}
              disabled={!selectedAddr}
              onPress={() => setStep('payment')}
            >
              <Text style={s.nextBtnText}>Continue to Payment</Text>
              <ChevronRight size={16} color="#fff" />
            </Pressable>
          </View>
        )}

        {/* ── Payment step ── */}
        {step === 'payment' && (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <CreditCard size={18} color="#3b82f6" />
              <Text style={s.cardTitle}>Payment Method</Text>
            </View>
            <Text style={s.hint}>
              Integrate Stripe Elements in production. Enter a Stripe PaymentMethod ID (pm_...) for testing.
            </Text>
            <TextInput
              style={s.input}
              placeholder="pm_card_visa (test token)"
              value={paymentMethodId}
              onChangeText={setPayment}
              autoCapitalize="none"
            />
            <Pressable
              style={[s.nextBtn, !paymentMethodId && s.nextBtnDisabled]}
              disabled={!paymentMethodId}
              onPress={() => setStep('review')}
            >
              <Text style={s.nextBtnText}>Review Order</Text>
              <ChevronRight size={16} color="#fff" />
            </Pressable>
          </View>
        )}

        {/* ── Review step ── */}
        {step === 'review' && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Order Summary</Text>
            {cart.items.map((item) => (
              <View key={item.productId} style={s.reviewItem}>
                <Text style={s.reviewItemName} numberOfLines={1}>{item.name} × {item.quantity}</Text>
                <Text style={s.reviewItemPrice}>${item.lineTotal.toFixed(2)}</Text>
              </View>
            ))}
            <View style={s.divider} />
            <View style={s.totalRow}><Text style={s.totalLabel}>Subtotal</Text><Text>${(cart?.subtotal ?? 0).toFixed(2)}</Text></View>
            <View style={s.totalRow}><Text style={s.totalLabel}>Shipping</Text><Text>{shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</Text></View>
            {(cart?.discountAmount ?? 0) > 0 && (
              <View style={s.totalRow}>
                <Text style={[s.totalLabel, { color: '#16a34a' }]}>Discount</Text>
                <Text style={{ color: '#16a34a' }}>-${cart?.discountAmount?.toFixed(2)}</Text>
              </View>
            )}
            <View style={[s.totalRow, { marginTop: 4 }]}>
              <Text style={s.grandTotalLabel}>Total</Text>
              <Text style={s.grandTotalValue}>${total.toFixed(2)}</Text>
            </View>

            <Text style={s.couponLabel}>Coupon Code (optional)</Text>
            <TextInput style={s.input} placeholder="SAVE20" value={coupon} onChangeText={setCoupon} autoCapitalize="characters" />

            <Pressable
              style={[s.placeBtn, placeOrder.isPending && s.nextBtnDisabled]}
              disabled={placeOrder.isPending}
              onPress={() => placeOrder.mutate()}
            >
              <Lock size={16} color="#fff" />
              <Text style={s.placeBtnText}>
                {placeOrder.isPending ? 'Placing Order…' : `Pay $${total.toFixed(2)}`}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  center:           { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  emptyText:        { fontSize: 15, color: '#6b7280', textAlign: 'center' },
  btn:              { backgroundColor: '#3b82f6', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  btnText:          { color: '#fff', fontWeight: '600' },
  steps:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e5e7eb' },
  card:             { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  cardHeader:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle:        { fontSize: 16, fontWeight: '700', color: '#111827' },
  hint:             { fontSize: 13, color: '#6b7280', lineHeight: 18 },
  input:            { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, backgroundColor: '#f9fafb' },
  addrCard:         { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'flex-start' },
  addrCardActive:   { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  radio:            { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#d1d5db', marginTop: 2 },
  radioActive:      { borderColor: '#3b82f6', backgroundColor: '#3b82f6' },
  addrName:         { fontSize: 14, fontWeight: '600', color: '#111827' },
  defaultBadge:     { fontSize: 11, color: '#3b82f6', fontWeight: '500' },
  addrLine:         { fontSize: 13, color: '#6b7280' },
  nextBtn:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 13 },
  nextBtnDisabled:  { opacity: 0.5 },
  nextBtnText:      { color: '#fff', fontWeight: '700', fontSize: 15 },
  reviewItem:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewItemName:   { fontSize: 14, color: '#374151', flex: 1, marginRight: 8 },
  reviewItemPrice:  { fontSize: 14, fontWeight: '600' },
  divider:          { height: 1, backgroundColor: '#e5e7eb' },
  totalRow:         { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel:       { fontSize: 14, color: '#6b7280' },
  grandTotalLabel:  { fontSize: 16, fontWeight: '700' },
  grandTotalValue:  { fontSize: 18, fontWeight: '800', color: '#1d4ed8' },
  couponLabel:      { fontSize: 13, fontWeight: '600', color: '#374151' },
  placeBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#16a34a', borderRadius: 12, paddingVertical: 14 },
  placeBtnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
});

const stepS = StyleSheet.create({
  label:       { fontSize: 13, color: '#9ca3af', fontWeight: '500', paddingHorizontal: 6 },
  labelActive: { color: '#3b82f6', fontWeight: '700' },
});
