'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Truck, ArrowRight } from 'lucide-react';

export default function CourierHubRetiredPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/admin/shipping-master');
    }, 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-amber-200/60 shadow-lg text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
          <Truck className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 font-serif">
          Courier Portal Retired / निवृत्त केले
        </h1>
        <p className="text-sm text-gray-600 leading-relaxed">
          The manual delivery boy portal has been retired. Dispatch and courier tracking are now managed purely through Shiprocket and Shipping Master.
        </p>
        <div className="pt-2">
          <Link
            href="/admin/shipping-master"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors shadow-sm"
          >
            <span>Go to Shipping Master</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <p className="text-xs text-gray-400">
          Redirecting to Shipping Master automatically in 3 seconds…
        </p>
      </div>
    </div>
  );
}
