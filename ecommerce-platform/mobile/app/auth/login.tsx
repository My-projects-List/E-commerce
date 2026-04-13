import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import Toast from 'react-native-toast-message';

export default function LoginScreen() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Toast.show({ type: 'error', text1: 'Please fill in all fields' });
      return;
    }
    setLoading(true);
    try {
      const tokens = await authApi.login({ email: email.trim(), password });
      setAuth(tokens);
      Toast.show({ type: 'success', text1: `Welcome back, ${tokens.name}!` });
      router.replace('/(tabs)/index');
    } catch (err: any) {
      const code = err.response?.data?.errorCode;
      Toast.show({
        type: 'error',
        text1: code === 'INVALID_CREDENTIALS' ? 'Invalid email or password'
             : code === 'ACCOUNT_DEACTIVATED'  ? 'Account is deactivated'
             : 'Login failed. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        {/* Logo area */}
        <View style={s.logoArea}>
          <View style={s.logo}><Text style={s.logoText}>S</Text></View>
          <Text style={s.title}>Welcome back</Text>
          <Text style={s.subtitle}>Sign in to your ShopNow account</Text>
        </View>

        {/* Form */}
        <View style={s.form}>
          <View style={s.field}>
            <Text style={s.label}>Email</Text>
            <TextInput
              style={s.input}
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>Password</Text>
            <View style={s.pwWrap}>
              <TextInput
                style={[s.input, { paddingRight: 48 }]}
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
                autoComplete="password"
              />
              <Pressable style={s.eyeBtn} onPress={() => setShowPw(!showPw)}>
                {showPw
                  ? <EyeOff size={18} color="#9ca3af" />
                  : <Eye size={18} color="#9ca3af" />}
              </Pressable>
            </View>
          </View>

          <Pressable
            style={[s.submitBtn, loading && s.submitBtnDisabled]}
            disabled={loading}
            onPress={handleLogin}
          >
            <Text style={s.submitText}>{loading ? 'Signing in…' : 'Sign In'}</Text>
          </Pressable>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>Don't have an account? </Text>
          <Pressable onPress={() => router.replace('/auth/register')}>
            <Text style={s.footerLink}>Create one</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:      { flexGrow: 1, padding: 24, justifyContent: 'center', backgroundColor: '#f9fafb' },
  logoArea:       { alignItems: 'center', marginBottom: 32, gap: 8 },
  logo:           { width: 56, height: 56, borderRadius: 16, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  logoText:       { color: '#fff', fontSize: 26, fontWeight: '800' },
  title:          { fontSize: 24, fontWeight: '700', color: '#111827' },
  subtitle:       { fontSize: 14, color: '#6b7280' },
  form:           { backgroundColor: '#fff', borderRadius: 16, padding: 20, gap: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  field:          { gap: 6 },
  label:          { fontSize: 14, fontWeight: '600', color: '#374151' },
  input:          { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, backgroundColor: '#f9fafb', color: '#111827' },
  pwWrap:         { position: 'relative' },
  eyeBtn:         { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
  submitBtn:      { backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  submitBtnDisabled: { opacity: 0.6 },
  submitText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer:         { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText:     { fontSize: 14, color: '#6b7280' },
  footerLink:     { fontSize: 14, color: '#3b82f6', fontWeight: '600' },
});
