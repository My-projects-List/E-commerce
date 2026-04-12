import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { User, Package, MapPin, Heart, ChevronRight, LogOut } from 'lucide-react-native';
import { userApi, authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

const MENU = [
  { icon: Package, label: 'My Orders',    href: '/orders' },
  { icon: MapPin,  label: 'Addresses',    href: '/addresses' },
  { icon: Heart,   label: 'Wishlist',     href: '/wishlist' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuthStore();

  useQuery({
    queryKey: ['profile'],
    queryFn: async () => { const p = await userApi.getProfile(); return p; },
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <View style={s.center}>
        <User size={48} color="#d1d5db" />
        <Text style={s.title}>Sign in to your account</Text>
        <Pressable style={s.primaryBtn} onPress={() => router.push('/auth/login')}>
          <Text style={s.primaryBtnText}>Sign In</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/auth/register')}>
          <Text style={s.linkText}>Create an account</Text>
        </Pressable>
      </View>
    );
  }

  const handleLogout = async () => {
    await authApi.logout();
    logout();
    router.replace('/(tabs)/index');
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Profile header */}
      <View style={s.profileHeader}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{user?.name?.[0]?.toUpperCase() ?? 'U'}</Text>
        </View>
        <View>
          <Text style={s.userName}>{user?.name}</Text>
          <Text style={s.userEmail}>{user?.email}</Text>
          {user?.role === 'ADMIN' && (
            <Text style={s.adminBadge}>Admin</Text>
          )}
        </View>
      </View>

      {/* Menu */}
      <View style={s.menu}>
        {MENU.map(({ icon: Icon, label, href }) => (
          <Pressable key={label} style={s.menuItem} onPress={() => router.push(href as any)}>
            <View style={s.menuIcon}><Icon size={20} color="#3b82f6" /></View>
            <Text style={s.menuLabel}>{label}</Text>
            <ChevronRight size={16} color="#9ca3af" />
          </Pressable>
        ))}
      </View>

      {/* Logout */}
      <Pressable style={s.logoutBtn} onPress={handleLogout}>
        <LogOut size={18} color="#ef4444" />
        <Text style={s.logoutText}>Log Out</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  title:          { fontSize: 17, fontWeight: '600', color: '#374151' },
  primaryBtn:     { backgroundColor: '#3b82f6', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 12, width: '100%', alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  linkText:       { color: '#3b82f6', fontSize: 14, fontWeight: '500' },
  profileHeader:  { backgroundColor: '#fff', padding: 20, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  avatar:         { width: 56, height: 56, borderRadius: 28, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center' },
  avatarText:     { color: '#fff', fontSize: 22, fontWeight: '700' },
  userName:       { fontSize: 17, fontWeight: '700', color: '#111827' },
  userEmail:      { fontSize: 13, color: '#6b7280', marginTop: 2 },
  adminBadge:     { fontSize: 11, color: '#3b82f6', fontWeight: '600', marginTop: 3 },
  menu:           { backgroundColor: '#fff', marginTop: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#e5e7eb', marginHorizontal: 16, borderRadius: 12, overflow: 'hidden' },
  menuItem:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  menuIcon:       { width: 36, height: 36, borderRadius: 8, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  menuLabel:      { flex: 1, fontSize: 15, fontWeight: '500', color: '#374151' },
  logoutBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, margin: 24, borderWidth: 1, borderColor: '#fecaca', borderRadius: 12, paddingVertical: 14 },
  logoutText:     { color: '#ef4444', fontWeight: '600', fontSize: 15 },
});
