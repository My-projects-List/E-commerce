import { Tabs } from 'expo-router';
import { Home, Search, ShoppingCart, User } from 'lucide-react-native';
import { View, Text } from 'react-native';
import { useCartStore } from '@/lib/store';

function CartTabIcon({ color, size }: { color: string; size: number }) {
  const cart = useCartStore((s) => s.cart);
  const count = cart?.itemCount ?? 0;
  return (
    <View>
      <ShoppingCart color={color} size={size} />
      {count > 0 && (
        <View style={{ position: 'absolute', top: -4, right: -8, backgroundColor: '#3b82f6', borderRadius: 8, minWidth: 16, paddingHorizontal: 3, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{count > 99 ? '99+' : count}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#3b82f6', tabBarInactiveTintColor: '#9ca3af', headerShown: false }}>
      <Tabs.Screen name="index"   options={{ title: 'Home',    tabBarIcon: (p) => <Home {...p} /> }} />
      <Tabs.Screen name="search"  options={{ title: 'Search',  tabBarIcon: (p) => <Search {...p} /> }} />
      <Tabs.Screen name="cart"    options={{ title: 'Cart',    tabBarIcon: (p) => <CartTabIcon {...p} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: (p) => <User {...p} /> }} />
    </Tabs>
  );
}
