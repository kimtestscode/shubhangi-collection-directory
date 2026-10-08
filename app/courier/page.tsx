'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Truck, Search, ScanLine, Camera, CameraOff, Upload, CheckCircle2,
  Clock, LogOut, Loader2, IndianRupee, Image as ImageIcon, X, Check,
  Share2, ArrowRight, RefreshCw, AlertCircle, Sparkles, Languages
} from 'lucide-react';
import {
  ShippingEntry, CourierPartner, COURIER_META,
  formatShippedAt, istDateKey, normalizeOrderNumber
} from '@/lib/shipping';

export default function CourierHubPage() {
  const router = useRouter();

  const [entries, setEntries] = useState<ShippingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [isMr, setIsMr] = useState(true);

  const tx = (en: string, mr: string) => (isMr ? mr : en);

  // Active view: 'awaiting' | 'completed'
  const [tab, setTab] = useState<'awaiting' | 'completed'>('awaiting');
  const [search, setSearch] = useState('');

  // Dispatch modal state
  const [selectedOrder, setSelectedOrder] = useState<ShippingEntry | null>(null);
  const [courierCompany, setCourierCompany] = useState<CourierPartner>('shree_maruti');
  const [docketNumber, setDocketNumber] = useState('');
  const [shippingCost, setShippingCost] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Camera QR scanner state
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load data
  const loadParcels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/courier/dispatch', { cache: 'no-store' });
      if (res.status === 401) {
        setAuthError(true);
        router.push('/courier/login');
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load parcels');
      setEntries(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadParcels();
  }, [loadParcels]);

  // Logout
  async function handleLogout() {
    await fetch('/api/courier/logout', { method: 'POST' });
    router.push('/courier/login');
  }

  // Camera QR Scan for finding parcel on box
  useEffect(() => {
    if (!cameraOn) return;
    let cancelled = false;
    let scanner: import('html5-qrcode').Html5Qrcode | null = null;

    (async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;
        scanner = new Html5Qrcode('courier-qr-reader');
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (text) => {
            const cleanCode = normalizeOrderNumber(text);
            const found = entries.find((e) => e.order_number === cleanCode);
            if (found) {
              setCameraOn(false);
              openDispatchModal(found);
            } else {
              setSearch(cleanCode);
              setCameraOn(false);
            }
          },
          () => {}
        );
      } catch (err) {
        if (!cancelled) {
          setCameraError(tx('Camera could not start. Please use search.', 'कॅमेरा सुरू होऊ शकला नाही.'));
          setCameraOn(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (scanner) {
        const s = scanner;
        s.stop().then(() => s.clear()).catch(() => {});
      }
    };
  }, [cameraOn, entries, isMr, tx]);

  // Open modal for an order
  function openDispatchModal(order: ShippingEntry) {
    setSelectedOrder(order);
    setCourierCompany(order.courier_partner || 'shree_maruti');
    setDocketNumber(order.tracking_number || '');
    setShippingCost(order.shipping_cost ? String(order.shipping_cost) : '');
    setPhotoUrl(order.docket_photo_url || '');
  }

  // Handle Photo upload
  async function handlePhotoCapture(file: File) {
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Photo upload failed');
      setPhotoUrl(data.url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Photo upload failed');
    } finally {
      setUploadingPhoto(false);
    }
  }

  // Submit parcel at hub
  async function handleSubmitDispatch(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOrder) return;

    if (!shippingCost || Number(shippingCost) <= 0) {
      alert(tx('Please enter the shipping cost (₹) for this parcel.', 'कृपया या पार्सलचा कुरिअर खर्च (₹) टाका.'));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/courier/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: selectedOrder.id,
          order_number: selectedOrder.order_number,
          courier_partner: courierCompany,
          tracking_number: docketNumber.trim(),
          shipping_cost: Number(shippingCost),
          docket_photo_url: photoUrl.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit dispatch');

      const updated: ShippingEntry = data.entry;
      setEntries((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setSelectedOrder(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error submitting parcel');
    } finally {
      setSubmitting(false);
    }
  }

  // Tally & statistics
  const todayKey = istDateKey(new Date());

  const awaitingList = useMemo(() => {
    return entries.filter((e) => e.status === 'picked_up');
  }, [entries]);

  const completedList = useMemo(() => {
    return entries.filter(
      (e) => e.status === 'dispatched' && (istDateKey(e.partner_submitted_at || e.shipped_at) === todayKey || !e.partner_submitted_at)
    );
  }, [entries, todayKey]);

  const totalCostToday = useMemo(() => {
    return completedList.reduce((sum, e) => sum + (Number(e.shipping_cost) || 0), 0);
  }, [completedList]);

  // Filtered list by search
  const displayedList = useMemo(() => {
    const list = tab === 'awaiting' ? awaitingList : completedList;
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (e) =>
        e.order_number.toLowerCase().includes(q) ||
        (e.customer_name ?? '').toLowerCase().includes(q) ||
        (e.customer_city ?? '').toLowerCase().includes(q) ||
        (e.customer_pincode ?? '').includes(q) ||
        (e.tracking_number ?? '').toLowerCase().includes(q)
    );
  }, [tab, awaitingList, completedList, search]);

  // Share WhatsApp Bill summary
  function handleShareBill() {
    if (completedList.length === 0) return;

    const dateStr = new Date().toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const lines: string[] = [
      `*Shubhangi Collection — Courier Dispatch Bill*`,
      `📅 Date: ${dateStr}`,
      `📦 Total Parcels: ${completedList.length}`,
      `💰 *Total Amount: ₹${totalCostToday.toLocaleString('en-IN')}*`,
      '',
      `*Itemized Breakdown:*`,
    ];

    completedList.forEach((e, idx) => {
      const partner = e.courier_partner ? COURIER_META[e.courier_partner]?.name : 'Courier';
      const docket = e.tracking_number ? `(${e.tracking_number})` : '';
      const cost = e.shipping_cost ? `₹${e.shipping_cost}` : '₹0';
      lines.push(`${idx + 1}. #${e.order_number} — ${partner} ${docket} — *${cost}*`);
    });

    lines.push('', `Shared from Shubhangi Collection Logistics Portal ✓`);

    const waText = encodeURIComponent(lines.join('\n'));
    window.open(`https://wa.me/?text=${waText}`, '_blank');
  }

  if (authError) return null;

  return (
    <div className="min-h-screen bg-ivory flex flex-col pb-20">
      {/* Top Mobile App Header */}
      <header className="sticky top-0 z-30 bg-charcoal text-white px-4 py-3 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gold text-charcoal font-bold flex items-center justify-center">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-sm leading-tight text-white">
              Shubhangi Collection
            </h1>
            <p className="text-[10px] text-ivory/70 leading-none">
              {tx('Hub Dispatch & Commercials', 'हब डिस्पॅच आणि खर्च नोंद')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsMr(!isMr)}
            className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-ivory flex items-center gap-1 border border-white/10"
          >
            <Languages className="w-3 h-3 text-gold" />
            <span>{isMr ? 'English' : 'मराठी'}</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            title={tx('Logout', 'लॉगआउट')}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-ivory"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Body Container */}
      <main className="max-w-md mx-auto w-full p-4 space-y-4">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-3 gap-2">
          {/* Awaiting Hub Dispatch */}
          <div
            onClick={() => setTab('awaiting')}
            className={`p-3 rounded-2xl border text-center cursor-pointer transition-all ${
              tab === 'awaiting'
                ? 'bg-amber-50 border-amber-300 shadow-xs'
                : 'bg-white border-border-warm'
            }`}
          >
            <div className="text-xl font-bold text-amber-600 leading-none">
              {awaitingList.length}
            </div>
            <div className="text-[10px] uppercase font-bold text-charcoal-light mt-1">
              {tx('Awaiting Hub', 'बाकी पार्सल')}
            </div>
          </div>

          {/* Dispatched Today */}
          <div
            onClick={() => setTab('completed')}
            className={`p-3 rounded-2xl border text-center cursor-pointer transition-all ${
              tab === 'completed'
                ? 'bg-emerald-50 border-emerald-300 shadow-xs'
                : 'bg-white border-border-warm'
            }`}
          >
            <div className="text-xl font-bold text-emerald-600 leading-none">
              {completedList.length}
            </div>
            <div className="text-[10px] uppercase font-bold text-charcoal-light mt-1">
              {tx('Dispatched', 'पूर्ण झाले')}
            </div>
          </div>

          {/* Total Cost / Commercials */}
          <div className="p-3 rounded-2xl bg-white border border-border-warm text-center">
            <div className="text-xl font-bold text-charcoal leading-none">
              ₹{totalCostToday}
            </div>
            <div className="text-[10px] uppercase font-bold text-gold mt-1">
              {tx('Total Cost', 'एकूण खर्च')}
            </div>
          </div>
        </div>

        {/* Quick QR Scanner & Search Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-charcoal-light absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tx('Search Order # or City…', 'ऑर्डर नं. किंवा गाव शोधा…')}
              className="w-full pl-9 pr-3 py-2 text-xs border border-border-warm rounded-xl bg-white focus:outline-none focus:border-gold"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setCameraError('');
              setCameraOn(!cameraOn);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-2xs transition-colors shrink-0 ${
              cameraOn ? 'bg-red-600 text-white' : 'bg-gold text-white hover:bg-gold/90'
            }`}
          >
            {cameraOn ? <CameraOff className="w-3.5 h-3.5" /> : <ScanLine className="w-3.5 h-3.5" />}
            <span>{cameraOn ? tx('Close', 'बंद') : tx('Scan QR', 'स्कॅन')}</span>
          </button>
        </div>

        {/* Camera Scanner View */}
        {cameraOn && (
          <div className="bg-white p-3 rounded-2xl border-2 border-gold shadow-md space-y-2">
            <div id="courier-qr-reader" className="w-full rounded-xl overflow-hidden" />
            <p className="text-[11px] text-center text-charcoal-light">
              {tx('Scan the QR on the parcel box to open dispatch form', 'पार्सलवरील QR कॅमेऱ्यासमोर धरा')}
            </p>
          </div>
        )}

        {cameraError && (
          <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs text-center">
            {cameraError}
          </div>
        )}

        {/* Tabs toggle */}
        <div className="flex bg-ivory-dark/80 p-1 rounded-2xl border border-border-warm">
          <button
            type="button"
            onClick={() => setTab('awaiting')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
              tab === 'awaiting'
                ? 'bg-white text-charcoal shadow-xs'
                : 'text-charcoal-light hover:text-charcoal'
            }`}
          >
            {tx('Awaiting Dispatch', 'डिस्पॅच बाकी')} ({awaitingList.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('completed')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
              tab === 'completed'
                ? 'bg-white text-charcoal shadow-xs'
                : 'text-charcoal-light hover:text-charcoal'
            }`}
          >
            {tx('Dispatched Today', 'आज डिस्पॅच केले')} ({completedList.length})
          </button>
        </div>

        {/* Parcels List */}
        {loading ? (
          <div className="py-12 text-center text-charcoal-light">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-gold" />
            <span className="text-xs">{tx('Loading parcels…', 'पार्सल लोड होत आहेत…')}</span>
          </div>
        ) : displayedList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border-warm p-8 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <div className="text-sm font-bold text-charcoal">
              {tab === 'awaiting'
                ? tx('All parcels dispatched! No pending orders.', 'सर्व पार्सल्स डिस्पॅच झाले आहेत!')
                : tx('No parcels dispatched yet today.', 'आज अजून कोणतेही पार्सल भरलेले नाही.')}
            </div>
            <p className="text-xs text-charcoal-light">
              {tab === 'awaiting'
                ? tx('Great job! You have logged all parcels.', 'उत्कृष्ट! सर्व पार्सल्स पूर्ण झाले आहेत.')
                : tx('Scan or select a parcel above to log shipping cost.', 'वर पार्सल स्कॅन करा किंवा निवडा.')}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {displayedList.map((order) => {
              const partner = order.courier_partner ? COURIER_META[order.courier_partner] : null;

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-border-warm p-3.5 shadow-2xs space-y-2.5 hover:border-gold/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-sm text-charcoal">
                          #{order.order_number}
                        </span>
                        {partner && (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${partner.badgeBg} ${partner.badgeBorder} ${partner.badgeText}`}
                          >
                            {isMr ? partner.nameMr : partner.name}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-charcoal mt-0.5">
                        {order.customer_name || 'Customer'}
                      </div>
                      <div className="text-[11px] text-charcoal-light">
                        {[order.customer_city, order.customer_pincode].filter(Boolean).join(' - ') || '—'}
                      </div>
                    </div>

                    {/* Cost Badge or Action */}
                    <div className="text-right shrink-0">
                      {order.shipping_cost ? (
                        <div className="bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-xl text-right">
                          <div className="text-xs font-bold text-emerald-700 font-mono">
                            ₹{order.shipping_cost}
                          </div>
                          <div className="text-[9px] uppercase tracking-wider text-emerald-600 font-semibold">
                            {tx('Cost', 'खर्च')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold">
                          {tx('Needs Cost', 'खर्च बाकी')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Docket and Details */}
                  {order.tracking_number && (
                    <div className="text-xs font-mono text-charcoal-light bg-ivory/60 px-2.5 py-1 rounded-lg border border-border-warm flex items-center justify-between">
                      <span>Docket: <strong className="text-charcoal">{order.tracking_number}</strong></span>
                      {order.docket_photo_url && (
                        <span className="text-[10px] text-gold font-bold flex items-center gap-0.5">
                          <ImageIcon className="w-3 h-3" /> Photo ✓
                        </span>
                      )}
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="pt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openDispatchModal(order)}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs ${
                        order.status === 'dispatched'
                          ? 'bg-ivory border border-border-warm text-charcoal hover:border-gold'
                          : 'bg-charcoal text-white hover:bg-charcoal/90'
                      }`}
                    >
                      {order.status === 'dispatched' ? (
                        <>
                          <span>{tx('Edit Courier & Cost (बदला)', 'खर्च व माहिती बदला')}</span>
                        </>
                      ) : (
                        <>
                          <Truck className="w-3.5 h-3.5" />
                          <span>{tx('Enter Courier & Cost (खर्च भरा)', 'कुरिअर कंपनी व खर्च भरा')}</span>
                          <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Share Bill Button at bottom of Completed view */}
        {tab === 'completed' && completedList.length > 0 && (
          <div className="pt-2">
            <button
              type="button"
              onClick={handleShareBill}
              className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span>{tx('Share WhatsApp Bill to Shubhangi Collection', 'व्हॉट्सॲपवर खर्चाचे बिल पाठवा')}</span>
            </button>
          </div>
        )}
      </main>

      {/* Dispatch Modal / Bottom Sheet */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-border-warm max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border-warm pb-3">
              <div>
                <h3 className="font-serif font-bold text-base text-charcoal">
                  {tx('Hub Dispatch Entry', 'कुरिअर डिस्पॅच नोंद')}
                </h3>
                <p className="text-xs text-charcoal-light">
                  Order <strong>#{selectedOrder.order_number}</strong> · {selectedOrder.customer_name || 'Customer'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded-lg text-charcoal-light hover:bg-ivory"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitDispatch} className="space-y-4 text-xs sm:text-sm">
              {/* Destination Summary */}
              <div className="p-2.5 rounded-xl bg-ivory border border-border-warm text-xs text-charcoal-light">
                <span className="font-semibold text-charcoal">{tx('Destination:', 'पत्ता:')} </span>
                {[selectedOrder.customer_city, selectedOrder.customer_pincode].filter(Boolean).join(' - ')}
              </div>

              {/* 1. Select Courier Partner */}
              <div>
                <label className="block font-bold text-charcoal mb-1.5">
                  1. {tx('Select Logistics Company', 'कुरिअर कंपनी निवडा')} *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['shree_maruti', 'anjani', 'india_post', 'other'] as CourierPartner[]).map((p) => {
                    const meta = COURIER_META[p];
                    const isSelected = courierCompany === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setCourierCompany(p)}
                        className={`p-2.5 rounded-xl border text-left font-medium transition-all ${
                          isSelected
                            ? 'border-gold bg-gold/15 text-charcoal font-bold shadow-2xs'
                            : 'border-border-warm bg-white text-charcoal-light hover:bg-ivory'
                        }`}
                      >
                        <div className="text-xs">{isMr ? meta.nameMr : meta.name}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Docket / Barcode Number */}
              <div>
                <label htmlFor="docket-input" className="block font-bold text-charcoal mb-1">
                  2. {tx('Docket / Barcode No.', 'डॉकेट / बारकोड नंबर')}
                </label>
                <input
                  id="docket-input"
                  value={docketNumber}
                  onChange={(e) => setDocketNumber(e.target.value)}
                  placeholder={
                    courierCompany === 'india_post'
                      ? 'e.g. EM123456789IN'
                      : courierCompany === 'anjani'
                      ? 'e.g. ANJ894204'
                      : 'e.g. 5204892'
                  }
                  className="w-full border border-border-warm rounded-xl px-3 py-2 text-xs font-mono bg-ivory/50 focus:outline-none focus:border-gold"
                />
              </div>

              {/* 3. Shipping Cost (₹) — Commercials */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="cost-input" className="font-bold text-charcoal">
                    3. {tx('Shipping Cost Charged (₹)', 'पार्सलचा कुरिअर खर्च (₹)')} *
                  </label>
                  <span className="text-[10px] text-red-600 font-semibold">
                    {tx('Required', 'आवश्यक')}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-charcoal text-sm">
                    ₹
                  </span>
                  <input
                    id="cost-input"
                    type="number"
                    inputMode="numeric"
                    required
                    min="1"
                    step="1"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(e.target.value)}
                    placeholder="e.g. 80"
                    className="w-full pl-8 pr-3 py-2.5 text-base font-bold font-mono border-2 border-border-warm rounded-xl bg-white focus:outline-none focus:border-gold text-charcoal"
                  />
                </div>

                {/* Quick Cost Chips */}
                <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
                  <span className="text-[10px] text-charcoal-light font-semibold shrink-0">
                    {tx('Quick:', 'पटकन टाका:')}
                  </span>
                  {['50', '60', '70', '80', '100', '120', '150'].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setShippingCost(amt)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold font-mono border border-border-warm bg-ivory hover:bg-gold/15 text-charcoal shrink-0"
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Parcel & Docket Photo */}
              <div>
                <label className="block font-bold text-charcoal mb-1">
                  4. {tx('Parcel & Barcode Photo (फोटो घ्या / जोडा)', 'पार्सलचा फोटो')}
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handlePhotoCapture(f);
                  }}
                />

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="flex-1 py-2.5 px-3 rounded-xl border border-border-warm bg-ivory hover:bg-gold/10 text-charcoal font-bold text-xs flex items-center justify-center gap-1.5"
                  >
                    {uploadingPhoto ? (
                      <Loader2 className="w-4 h-4 animate-spin text-gold" />
                    ) : (
                      <Camera className="w-4 h-4 text-gold" />
                    )}
                    <span>
                      {photoUrl
                        ? tx('Change Photo', 'फोटो बदला')
                        : tx('Take / Upload Photo', 'कॅमेऱ्याने फोटो घ्या')}
                    </span>
                  </button>
                </div>

                {photoUrl && (
                  <div className="mt-2 relative w-20 h-20 rounded-xl overflow-hidden border border-border-warm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoUrl} alt="Docket" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotoUrl('')}
                      className="absolute top-1 right-1 p-0.5 rounded-full bg-black/70 text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting || !shippingCost}
                  className="w-full py-3.5 rounded-2xl bg-charcoal text-white font-bold text-xs sm:text-sm hover:bg-charcoal/90 disabled:opacity-40 transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>{tx('Submit & Save ₹ Cost', 'सेव्ह करा व डिस्पॅच नोंदवा')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
