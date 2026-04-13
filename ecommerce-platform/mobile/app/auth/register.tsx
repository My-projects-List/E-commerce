import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, Check } from 'lucide-react-native';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import Toast from 'react-native-toast-message';

export default function RegisterScreen() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const pwChecks = [
    { label: '8+ chars',  ok: form.password.length >= 8 },
    { label: 'Uppercase', ok: /[A-Z]/.test(form.password) },
    { label: 'Number',    ok: /[0-9]/.test(form.password) },
    { label: 'Symbol',    ok: /[^A-Za-z0-9]/.test(form.password) },
  ];

  const handleRegister = async () => {
    if (!form.name || !form.email || !form.password) {
      Toast.show({ type: 'error', text1: 'Please fill in required fields' });
      return;
    }
    setLoading(true);
    try {
      const tokens = await authApi.register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phoneNumber: form.phone || undefined,
      });
      setAuth(tokens);
      Toast.show({ type: 'success', text1: 'Account created!', text2: `Welcome, ${tokens.name}` });
      router.replace('/(tabs)/index');
    } catch (err: any) {
      const code = err.response?.data?.errorCode;
      Toast.show({
        type: 'error',
        text1: code === 'EMAIL_TAKEN' ? 'Email already registered' : 'Registration failed',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <View style={s.logoArea}>
          <View style={s.logo}><Text style={s.logoText}>S</Text></View>
          <Text style={s.title}>Create account</Text>
          <Text style={s.subtitle}>Join ShopNow today — it's free</Text>
        </View>

        <View style={s.form}>
          <View style={s.field}>
            <Text style={s.label}>Full Name <Text style={s.req}>*</Text></Text>
            <TextInput style={s.input} placeholder="John Doe" value={form.name} onChangeText={set('name')} autoCapitalize="words" />
          </View>

          <View style={s.field}>
            <Text style={s.label}>Email <Text style={s.req}>*</Text></Text>
            <TextInput style={s.input} placeholder="you@example.com" value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" />
          </View>

          <View style={s.field}>
            <Text style={s.label}>Phone (optional)</Text>
            <TextInput style={s.input} placeholder="+1 234 567 8900" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
          </View>

          <View style={s.field}>
            <Text style={s.label}>Password <Text style={s.req}>*</Text></Text>
            <View style={s.pwWrap}>
              <TextInput style={[s.input, { paddingRight: 48 }]} placeholder="••••••••" value={form.password} onChangeText={set('password')} secureTextEntry={!showPw} />
              <Pressable style={s.eyeBtn} onPress={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff size={18} color="#9ca3af" /> : <Eye size={18} color="#9ca3af" />}
              </Pressable>
            </View>
            {/* Strength bar */}
            <View style={s.strengthRow}>
              {pwChecks.map((c) => (
                <View key={c.label} style={[s.strengthBar, c.ok && s.strengthBarGreen]} />
              ))}
            </View>
            <View style={s.checksRow}>
              {pwChecks.map((c) => (
                <View key={c.label} style={s.checkItem}>
                  <Check size={11} color={c.ok ? '#16a34a' : '#d1d5db'} />
                  <Text style={[s.checkLabel, c.ok && s.checkLabelGreen]}>{c.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <Pressable
            style={[s.submitBtn, loading && s.submitBtnDisabled]}
            disabled={loading}
            onPress={handleRegister}
          >
            <Text style={s.submitText}>{loading ? 'Creating account…' : 'Create Account'}</Text>
          </Pressable>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>Already have an account? </Text>
          <Pressable onPress={() => router.replace('/auth/login')}>
            <Text style={s.footerLink}>Sign in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:        { flexGrow: 1, padding: 24, backgroundColor: '#f9fafb' },
  logoArea:         { alignItems: 'center', marginBottom: 24, marginTop: 12, gap: 6 },
  logo:             { width: 52, height: 52, borderRadius: 14, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  logoText:         { color: '#fff', fontSize: 24, fontWeight: '800' },
  title:            { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle:         { fontSize: 14, color: '#6b7280' },
  form:             { backgroundColor: '#fff', borderRadius: 16, padding: 20, gap: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  field:            { gap: 6 },
  label:            { fontSize: 14, fontWeight: '600', color: '#374151' },
  req:              { color: '#ef4444' },
  input:            { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, backgroundColor: '#f9fafb', color: '#111827' },
  pwWrap:           { position: 'relative' },
  eyeBtn:           { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
  strengthRow:      { flexDirection: 'row', gap: 4, marginTop: 6 },
  strengthBar:      { flex: 1, height: 3, borderRadius: 2, backgroundColor: '#e5e7eb' },
  strengthBarGreen: { backgroundColor: '#22c55e' },
  checksRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  checkItem:        { flexDirection: 'row', alignItems: 'center', gap: 3 },
  checkLabel:       { fontSize: 11, color: '#9ca3af' },
  checkLabelGreen:  { color: '#16a34a' },
  submitBtn:        { backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  submitBtnDisabled:{ opacity: 0.6 },
  submitText:       { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer:           { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText:       { fontSize: 14, color: '#6b7280' },
  footerLink:       { fontSize: 14, color: '#3b82f6', fontWeight: '600' },
});
