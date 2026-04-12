'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ShoppingBag, Check } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const pwStrength = [
    form.password.length >= 8,
    /[A-Z]/.test(form.password),
    /[0-9]/.test(form.password),
    /[^A-Za-z0-9]/.test(form.password),
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwStrength.filter(Boolean).length < 2) {
      toast.error('Please use a stronger password'); return;
    }
    setLoading(true);
    try {
      const tokens = await authApi.register({ email: form.email, password: form.password, name: form.name, phoneNumber: form.phone || undefined });
      setAuth(tokens);
      toast.success('Account created!');
      router.push('/');
    } catch (err: any) {
      const code = err.response?.data?.errorCode;
      toast.error(code === 'EMAIL_TAKEN' ? 'Email already registered' : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border bg-card shadow-sm p-8 space-y-6">
          <div className="text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary mb-3">
              <ShoppingBag className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">Create account</h1>
            <p className="text-sm text-muted-foreground mt-1">Join ShopNow today</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Full Name</label>
              <input type="text" required className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="John Doe" value={form.name} onChange={set('name')} />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email</label>
              <input type="email" required className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="you@example.com" value={form.email} onChange={set('email')} />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Phone (optional)</label>
              <input type="tel" className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="+1 234 567 8900" value={form.phone} onChange={set('phone')} />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} required className="w-full rounded-lg border bg-background px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="••••••••" value={form.password} onChange={set('password')} />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* Strength indicators */}
              <div className="grid grid-cols-4 gap-1 mt-1.5">
                {pwStrength.map((ok, i) => (
                  <div key={i} className={`h-1 rounded-full ${ok ? 'bg-green-500' : 'bg-muted'}`} />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                {[['8+ characters', pwStrength[0]], ['Uppercase', pwStrength[1]], ['Number', pwStrength[2]], ['Symbol', pwStrength[3]]].map(([l, ok]) => (
                  <span key={l as string} className={`flex items-center gap-0.5 ${ok ? 'text-green-600' : ''}`}>
                    {ok && <Check className="h-3 w-3" />}{l as string}
                  </span>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
