'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, Lock, ArrowRight, Loader2, ShieldCheck, Languages } from 'lucide-react';

export default function CourierLoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMr, setIsMr] = useState(true);

  const tx = (en: string, mr: string) => (isMr ? mr : en);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!pin.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/courier/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid PIN');
      }

      router.push('/courier');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  function handleKeypad(digit: string) {
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
    }
  }

  function handleBackspace() {
    setPin((prev) => prev.slice(0, -1));
  }

  return (
    <div className="min-h-screen bg-ivory flex flex-col justify-between p-4 sm:p-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between max-w-sm mx-auto w-full pt-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gold/20 flex items-center justify-center text-gold font-bold">
            <Truck className="w-4 h-4" />
          </div>
          <span className="font-serif font-bold text-charcoal text-sm">
            Shubhangi Collection
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsMr(!isMr)}
          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border border-border-warm bg-white text-charcoal hover:bg-ivory"
        >
          <Languages className="w-3.5 h-3.5 text-gold" />
          <span>{isMr ? 'English' : 'मराठी'}</span>
        </button>
      </div>

      {/* Main Card */}
      <div className="max-w-sm mx-auto w-full bg-white rounded-3xl p-6 sm:p-8 border border-border-warm shadow-md my-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gold/15 text-gold flex items-center justify-center mx-auto mb-2 shadow-2xs">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-charcoal">
            {tx('Courier Partner Portal', 'डिलिव्हरी पार्टनर लॉगिन')}
          </h1>
          <p className="text-xs text-charcoal-light leading-relaxed">
            {tx(
              'Enter your 4-digit PIN to access parcel dispatch and log shipping expenses.',
              'पार्सल डिस्पॅच आणि कुरिअर खर्च भरण्यासाठी तुमचा 4-अंकी पिन टाका.'
            )}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          {/* PIN Input Display */}
          <div className="relative">
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full text-center text-2xl font-mono tracking-widest py-3 border-2 border-border-warm rounded-2xl bg-ivory/50 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-charcoal"
            />
          </div>

          {/* Quick Number Keypad for Mobile Screen */}
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleKeypad(d)}
                className="py-3 text-lg font-bold font-mono rounded-xl bg-ivory/70 hover:bg-gold/15 text-charcoal border border-border-warm/60 active:scale-95 transition-all"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPin('')}
              className="py-3 text-xs font-semibold rounded-xl bg-ivory/50 text-charcoal-light border border-border-warm/60 active:scale-95 transition-all"
            >
              {tx('Clear', 'काढा')}
            </button>
            <button
              type="button"
              onClick={() => handleKeypad('0')}
              className="py-3 text-lg font-bold font-mono rounded-xl bg-ivory/70 hover:bg-gold/15 text-charcoal border border-border-warm/60 active:scale-95 transition-all"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="py-3 text-xs font-semibold rounded-xl bg-ivory/50 text-charcoal-light border border-border-warm/60 active:scale-95 transition-all"
            >
              ⌫
            </button>
          </div>

          <button
            type="submit"
            disabled={!pin || loading}
            className="w-full py-3.5 rounded-2xl bg-charcoal text-white font-semibold text-sm hover:bg-charcoal/90 disabled:opacity-40 transition-colors flex items-center justify-center gap-2 shadow-xs"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{tx('Enter Hub Portal', 'पोर्टल उघडा')}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="text-center text-[11px] text-charcoal-light/60 py-2">
        Shubhangi Collection Logistics &amp; Dispatch
      </div>
    </div>
  );
}
