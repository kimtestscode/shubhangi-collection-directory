'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShoppingBag, Eye, EyeOff, User, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { Suspense } from 'react';

function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<'user' | 'master'>('user');
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const payload = loginMode === 'user'
      ? { username: username.trim(), password: password.trim() }
      : { password: password.trim() };

    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      const destination = from && from !== '/admin' ? from : (data.redirectTo || '/admin');
      window.location.href = destination;
    } else {
      setError(data.error || 'Incorrect credentials. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-border-warm shadow-md p-8 w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gold/15 flex items-center justify-center text-gold">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-charcoal">Shubhangi Collection</h1>
            <p className="text-xs tracking-wider text-charcoal-light uppercase font-semibold mt-0.5">
              Admin & Staff Portal / ॲडमीन पोर्टल
            </p>
          </div>
        </div>

        {/* Tab switch between Staff/User account and Master Key */}
        <div className="grid grid-cols-2 p-1 bg-ivory rounded-2xl border border-border-warm text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setLoginMode('user'); setError(''); }}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              loginMode === 'user'
                ? 'bg-white text-charcoal shadow-xs font-bold'
                : 'text-charcoal-light hover:text-charcoal'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Staff / User Login</span>
          </button>
          <button
            type="button"
            onClick={() => { setLoginMode('master'); setError(''); }}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              loginMode === 'master'
                ? 'bg-white text-charcoal shadow-xs font-bold'
                : 'text-charcoal-light hover:text-charcoal'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Master Admin</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {loginMode === 'user' && (
            <div>
              <label htmlFor="username" className="block text-xs font-bold text-charcoal-light uppercase tracking-wider mb-1.5">
                Username / युझरनेम
              </label>
              <div className="relative">
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoCapitalize="none"
                  autoComplete="username"
                  className="w-full border border-border-warm rounded-xl pl-10 pr-4 py-2.5 text-sm text-charcoal bg-ivory/30 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                  placeholder="e.g. admin or dispatch_staff"
                />
                <User className="w-4 h-4 text-charcoal-light/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-xs font-bold text-charcoal-light uppercase tracking-wider mb-1.5">
              {loginMode === 'master' ? 'Master Admin Password' : 'Password / PIN'}
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full border border-border-warm rounded-xl pl-10 pr-10 py-2.5 text-sm text-charcoal bg-ivory/30 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                placeholder={loginMode === 'master' ? 'Enter master admin secret' : 'Enter account password or PIN'}
              />
              <Lock className="w-4 h-4 text-charcoal-light/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-light hover:text-charcoal p-1"
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password.trim() || (loginMode === 'user' && !username.trim())}
            className="w-full bg-charcoal hover:bg-charcoal/90 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-40 shadow-xs flex items-center justify-center gap-2 text-sm"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="pt-2 text-center text-[11px] text-charcoal-light border-t border-border-warm">
          Delivery partner? Access the dedicated{' '}
          <a href="/courier/login" className="text-gold font-semibold hover:underline">
            Courier Mobile Hub Portal →
          </a>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
