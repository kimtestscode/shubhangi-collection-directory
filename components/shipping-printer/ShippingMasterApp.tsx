'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ScanLine, Camera, CameraOff, Download, Trash2, Search, CheckCircle2,
  AlertTriangle, XCircle, Loader2, PackageCheck, CalendarDays, Printer, Truck,
  ExternalLink, MessageCircle, Upload, Image as ImageIcon, Clock, Edit3, Check,
  X, ChevronDown, Sparkles, AlertCircle, RefreshCw
} from 'lucide-react';
import { useLanguage } from '@/lib/languageContext';
import {
  ShippingEntry, ShippingStatus, CourierPartner, COURIER_META,
  formatShippedAt, istDateKey, getTimeElapsed, getWhatsAppUrl,
  cleanMobileNumber, buildWhatsAppTrackingMessage
} from '@/lib/shipping';

type Feedback =
  | { kind: 'success'; order: string; at?: string; note?: string }
  | { kind: 'duplicate'; order: string; at?: string }
  | { kind: 'error'; message: string };

const HANDED_TO_KEY = 'shubhangi_shipping_handed_to';

/** Short beep so the packer knows a scan registered without looking at the screen. */
function beep(freq: number, ms = 120) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    osc.frequency.value = freq;
    osc.connect(ctx.destination);
    osc.start();
    setTimeout(() => { osc.stop(); ctx.close(); }, ms);
  } catch {
    /* audio is a nicety, never block on it */
  }
}

export default function ShippingMasterApp() {
  const { lang } = useLanguage();
  const isMr = lang === 'mr';
  const tx = (en: string, mr: string) => (isMr ? mr : en);

  const [entries, setEntries] = useState<ShippingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // Status Filter Tabs: 'all' | 'pending' | 'picked_up' | 'dispatched'
  const [statusTab, setStatusTab] = useState<'all' | ShippingStatus>('all');

  const [manualCode, setManualCode] = useState('');
  const [handedTo, setHandedTo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterCourier, setFilterCourier] = useState<string>('all');

  // Edit Tracking Modal / Drawer state
  const [editingEntry, setEditingEntry] = useState<ShippingEntry | null>(null);
  const [editCourier, setEditCourier] = useState<CourierPartner>('shree_maruti');
  const [editDocket, setEditDocket] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Photo viewer modal
  const [viewingPhotoUrl, setViewingPhotoUrl] = useState<string | null>(null);

  const handedToRef = useRef('');
  const lastScanRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });
  const busyRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── load master ──────────────────────────────────────────────────────────
  const loadEntries = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch('/api/shipping', { cache: 'no-store' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to load');
      setEntries(body);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(HANDED_TO_KEY);
      if (saved) setHandedTo(saved);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    handedToRef.current = handedTo;
    try { localStorage.setItem(HANDED_TO_KEY, handedTo); } catch { /* ignore */ }
  }, [handedTo]);

  // ─── record a scan ────────────────────────────────────────────────────────
  const submitOrder = useCallback(async (raw: string) => {
    const code = raw.trim();
    if (!code || busyRef.current) return;

    // Camera sees the same QR for many frames; ignore repeats of the same code for a few seconds.
    const now = Date.now();
    if (lastScanRef.current.code === code && now - lastScanRef.current.time < 4000) return;
    lastScanRef.current = { code, time: now };

    busyRef.current = true;
    setSubmitting(true);
    try {
      const res = await fetch('/api/shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_number: code, handed_to: handedToRef.current }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to save');

      const entry: ShippingEntry = body.entry;
      if (body.status === 'created') {
        setEntries((prev) => {
          const filtered = prev.filter((x) => x.id !== entry.id);
          return [entry, ...filtered];
        });
        setFeedback({ kind: 'success', order: entry.order_number, at: entry.shipped_at || undefined });
        beep(880);
        navigator.vibrate?.(80);
      } else {
        setFeedback({ kind: 'duplicate', order: entry.order_number, at: entry.shipped_at || undefined });
        beep(300, 300);
        navigator.vibrate?.([100, 60, 100]);
      }
      setHighlightId(entry.id);
      setTimeout(() => setHighlightId(null), 3000);
    } catch (e) {
      setFeedback({ kind: 'error', message: e instanceof Error ? e.message : 'Failed to save' });
      lastScanRef.current = { code: '', time: 0 }; // allow an immediate retry
      beep(200, 400);
    } finally {
      busyRef.current = false;
      setSubmitting(false);
    }
  }, []);

  const submitRef = useRef(submitOrder);
  useEffect(() => { submitRef.current = submitOrder; }, [submitOrder]);

  // ─── camera ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!cameraOn) return;
    let cancelled = false;
    let scanner: import('html5-qrcode').Html5Qrcode | null = null;

    (async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;
        scanner = new Html5Qrcode('qr-reader');
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (text) => submitRef.current(text),
          () => { /* per-frame "no code found" noise */ },
        );
        if (cancelled) await scanner.stop().catch(() => {});
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        setCameraError(
          /permission|denied|notallowed/i.test(msg)
            ? tx('Camera permission was blocked. Allow camera access in browser and try again.', 'कॅमेराची परवानगी नाकारली गेली. ब्राउझरमध्ये परवानगी द्या.')
            : tx('Could not start camera. Needs HTTPS and camera device.', 'कॅमेरा सुरू होऊ शकला नाही. HTTPS आणि कॅमेरा आवश्यक आहे.'),
        );
        setCameraOn(false);
      }
    })();

    return () => {
      cancelled = true;
      if (scanner) {
        const s = scanner;
        s.stop().then(() => s.clear()).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOn]);

  function toggleCamera() {
    setCameraError('');
    setCameraOn((on) => !on);
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = manualCode;
    setManualCode('');
    lastScanRef.current = { code: '', time: 0 };
    submitOrder(code);
  }

  async function handleDelete(entry: ShippingEntry) {
    const ok = window.confirm(
      tx(`Remove order ${entry.order_number} from shipping master?`, `ऑर्डर ${entry.order_number} शिपिंग मास्टरमधून काढायचा?`),
    );
    if (!ok) return;
    const res = await fetch(`/api/shipping/${entry.id}`, { method: 'DELETE' });
    if (res.ok) {
      setEntries((prev) => prev.filter((x) => x.id !== entry.id));
      lastScanRef.current = { code: '', time: 0 };
    } else {
      const body = await res.json().catch(() => ({}));
      setFeedback({ kind: 'error', message: body.error || 'Failed to remove' });
    }
  }

  // ─── Courier & Tracking Modal ─────────────────────────────────────────────
  function openEditModal(entry: ShippingEntry) {
    setEditingEntry(entry);
    setEditCourier(entry.courier_partner || 'shree_maruti');
    setEditDocket(entry.tracking_number || '');
    setEditPhotoUrl(entry.docket_photo_url || '');
  }

  async function handleSaveTracking() {
    if (!editingEntry) return;
    setSavingEdit(true);
    try {
      const partnerMeta = COURIER_META[editCourier];
      const trackingUrl = partnerMeta ? partnerMeta.getTrackingUrl(editDocket) : '';

      const res = await fetch(`/api/shipping/${editingEntry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courier_partner: editCourier,
          tracking_number: editDocket.trim(),
          tracking_url: trackingUrl,
          docket_photo_url: editPhotoUrl.trim() || null,
          status: editDocket.trim() ? 'dispatched' : editingEntry.status,
        }),
      });

      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error || 'Failed to update tracking');

      setEntries((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setEditingEntry(null);
      beep(880, 80);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error updating tracking');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleFileUpload(file: File) {
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Upload failed');
      setEditPhotoUrl(data.url);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Photo upload failed');
    } finally {
      setUploadingPhoto(false);
    }
  }

  // ─── 1-Click WhatsApp Tracking ────────────────────────────────────────────
  async function handleSendWhatsApp(entry: ShippingEntry) {
    const waUrl = getWhatsAppUrl(entry);
    if (!waUrl) {
      alert(
        tx(
          'Customer mobile number is missing or invalid. Please check the address.',
          'ग्राहकाचा मोबाईल नंबर उपलब्ध नाही किंवा चुकीचा आहे.'
        )
      );
      return;
    }

    // Open WhatsApp Web or Mobile App
    window.open(waUrl, '_blank');

    // Mark as sent in background
    try {
      const res = await fetch(`/api/shipping/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp_sent: true }),
      });
      if (res.ok) {
        const updated = await res.json();
        setEntries((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      }
    } catch (err) {
      console.error('Failed to mark WhatsApp as sent:', err);
    }
  }

  // ─── Derived counts and filtering ─────────────────────────────────────────
  const todayKey = istDateKey(new Date());

  const counts = useMemo(() => {
    let pending = 0;
    let pickedUp = 0;
    let dispatched = 0;
    let delayed = 0;

    for (const e of entries) {
      const st = e.status || (e.shipped_at ? 'picked_up' : 'pending');
      if (st === 'pending') {
        pending++;
        const elapsed = getTimeElapsed(e.printed_at || e.created_at);
        if (elapsed.hours >= 24) delayed++;
      } else if (st === 'picked_up') {
        pickedUp++;
      } else if (st === 'dispatched') {
        dispatched++;
      }
    }
    return { all: entries.length, pending, pickedUp, dispatched, delayed };
  }, [entries]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      // Status tab filter
      const effectiveStatus: ShippingStatus = e.status || (e.shipped_at ? 'picked_up' : 'pending');
      if (statusTab !== 'all' && effectiveStatus !== statusTab) return false;

      // Courier filter
      if (filterCourier !== 'all' && e.courier_partner !== filterCourier) return false;

      // Date filter
      const dateTarget = e.shipped_at || e.printed_at || e.created_at;
      if (filterDate && istDateKey(dateTarget) !== filterDate) return false;

      // Search query across order number, customer name, mobile, docket
      if (!q) return true;
      return (
        e.order_number.toLowerCase().includes(q) ||
        (e.customer_name ?? '').toLowerCase().includes(q) ||
        (e.customer_mobile ?? '').includes(q) ||
        (e.tracking_number ?? '').toLowerCase().includes(q) ||
        (e.handed_to ?? '').toLowerCase().includes(q)
      );
    });
  }, [entries, statusTab, filterCourier, filterDate, search]);

  function exportCsv() {
    const esc = (v: string | null | undefined) => `"${(v ?? '').replace(/"/g, '""')}"`;
    const rows = [
      [
        'Order No',
        'Status',
        'Customer Name',
        'Customer Mobile',
        'City',
        'Pincode',
        'Courier Partner',
        'Docket / Tracking No',
        'Tracking URL',
        'Shipped / Pickup At',
        'Printed At',
        'Handed To',
        'WhatsApp Sent',
      ],
    ];

    for (const e of visible) {
      const courierName = e.courier_partner ? COURIER_META[e.courier_partner]?.name : '';
      rows.push([
        e.order_number,
        e.status || 'pending',
        e.customer_name ?? '',
        e.customer_mobile ?? '',
        e.customer_city ?? '',
        e.customer_pincode ?? '',
        courierName,
        e.tracking_number ?? '',
        e.tracking_url ?? '',
        e.shipped_at ? formatShippedAt(e.shipped_at) : '',
        e.printed_at ? formatShippedAt(e.printed_at) : '',
        e.handed_to ?? '',
        e.whatsapp_sent ? 'Yes' : 'No',
      ]);
    }
    const csv = rows.map((r) => r.map(esc).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shubhangi-shipping-master-${statusTab}-${filterDate || todayKey}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const tableMissing = /shipping_master/i.test(loadError);

  // ─── UI ───────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-charcoal via-charcoal/95 to-charcoal/90 text-ivory p-5 sm:p-7 rounded-3xl shadow-lg border border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/20 text-gold text-[11px] font-semibold border border-gold/30">
            <Truck className="w-3.5 h-3.5" />
            {tx('Dispatch & Tracking Command Center', 'डिस्पॅच आणि ट्रॅकिंग व्यवस्थापन')}
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {tx('Order Shipping Master', 'ऑर्डर शिपिंग मास्टर')}
          </h1>
          <p className="text-sm text-ivory/80 max-w-2xl leading-relaxed">
            {tx(
              'Track parcels from packing to courier pickup and hub dispatch. Assign Shree Maruti, Anjani, or India Post tracking IDs and send 1-click tracking links directly to customer WhatsApp.',
              'पॅकिंगपासून कुरिअर पिकअप आणि डिस्पॅचपर्यंत सर्व ट्रॅक करा. श्री मारुती, अंजनी किंवा भारतीय डाक ट्रॅकिंग नंबर जोडून ग्राहकांना 1-क्लिकमध्ये WhatsApp वर ट्रॅकिंग लिंक पाठवा.'
            )}
          </p>
        </div>

        {/* Counter KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2.5">
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 text-center border border-white/10">
            <div className="text-xl font-bold text-amber-300 leading-none">{counts.pending}</div>
            <div className="text-[10px] uppercase tracking-wider text-ivory/70 mt-1">
              {tx('Pending Pickup', 'पिकअप बाकी')}
            </div>
            {counts.delayed > 0 && (
              <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded bg-red-500/30 text-red-200 border border-red-400/40 font-semibold">
                {counts.delayed} {tx('delayed', 'उशीर')}
              </span>
            )}
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 text-center border border-white/10">
            <div className="text-xl font-bold text-sky-300 leading-none">{counts.pickedUp}</div>
            <div className="text-[10px] uppercase tracking-wider text-ivory/70 mt-1">
              {tx('Picked Up (Hub)', 'पिकअप झाले')}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 text-center border border-white/10">
            <div className="text-xl font-bold text-emerald-400 leading-none">{counts.dispatched}</div>
            <div className="text-[10px] uppercase tracking-wider text-ivory/70 mt-1">
              {tx('Dispatched', 'डिस्पॅच पूर्ण')}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 text-center border border-white/10">
            <div className="text-xl font-bold text-white leading-none">{counts.all}</div>
            <div className="text-[10px] uppercase tracking-wider text-ivory/70 mt-1">
              {tx('Total Orders', 'एकूण ऑर्डर्स')}
            </div>
          </div>
        </div>
      </div>

      {tableMissing && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl p-4 text-sm space-y-2">
          <div className="font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            {tx('Database upgrade needed', 'डेटाबेस अपडेट आवश्यक')}
          </div>
          <p>
            {tx(
              'Open Supabase → SQL Editor, run the updated script from supabase/shipping_master.sql to enable customer details, courier partners, and tracking fields. Then reload this page.',
              'Supabase → SQL Editor उघडा आणि supabase/shipping_master.sql मधील स्क्रिप्ट Run करा. त्यानंतर हे पेज रिलोड करा.'
            )}
          </p>
        </div>
      )}

      {/* Pickup Scanning Card */}
      <div className="bg-white rounded-3xl border border-border-warm shadow-sm p-5 sm:p-7 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gold/15 flex items-center justify-center text-gold">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-charcoal">
                {tx('Scan Pickup Labels', 'पिकअप लेबल्स स्कॅन करा')}
              </h2>
              <p className="text-xs text-charcoal-light">
                {tx(
                  'Scan the order QR when handing parcels to delivery partner. Marks status as Picked Up automatically.',
                  'डिलिव्हरी पार्टनरकडे पार्सल देताना लेबल्सवरील QR स्कॅन करा. आपोआप पिकअप नोंद होईल.'
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleCamera}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-xs ${
              cameraOn ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gold text-white hover:bg-gold/90'
            }`}
          >
            {cameraOn ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
            {cameraOn ? tx('Stop Camera', 'कॅमेरा बंद करा') : tx('Start Camera Scan', 'कॅमेरा स्कॅन सुरू करा')}
          </button>
        </div>

        {cameraError && (
          <p className="text-xs sm:text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            {cameraError}
          </p>
        )}

        {/* Video stream container for html5-qrcode */}
        <div
          id="qr-reader"
          className={cameraOn ? 'w-full max-w-sm mx-auto rounded-2xl overflow-hidden border-2 border-gold/50 shadow-md' : 'hidden'}
        />

        {/* Result banner */}
        {feedback && (
          <div
            role="status"
            className={`flex items-start gap-3 rounded-2xl px-4 py-3 border ${
              feedback.kind === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : feedback.kind === 'duplicate'
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-red-50 border-red-300 text-red-900'
            }`}
          >
            {feedback.kind === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />}
            {feedback.kind === 'duplicate' && <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />}
            {feedback.kind === 'error' && <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />}
            <div className="text-xs sm:text-sm">
              {feedback.kind === 'success' && (
                <>
                  <div className="font-bold">
                    {tx('Order', 'ऑर्डर')} #{feedback.order} {tx('marked Picked Up ✓', 'पिकअप नोंदवला ✓')}
                  </div>
                  <div className="text-emerald-700">{formatShippedAt(feedback.at)}</div>
                </>
              )}
              {feedback.kind === 'duplicate' && (
                <>
                  <div className="font-bold">
                    {tx('Order', 'ऑर्डर')} #{feedback.order} {tx('was already scanned', 'आधीच स्कॅन केला आहे')}
                  </div>
                  <div className="text-amber-800">
                    {tx('Scanned at', 'स्कॅन वेळ')}: {formatShippedAt(feedback.at)}
                  </div>
                </>
              )}
              {feedback.kind === 'error' && (
                <>
                  <div className="font-bold">{tx('Could not save', 'सेव्ह होऊ शकले नाही')}</div>
                  <div>{feedback.message}</div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Manual scanner / hardware barcode entry */}
        <form onSubmit={handleManualSubmit} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end pt-1">
          <div>
            <label htmlFor="manual-order" className="block text-xs font-semibold text-charcoal-light mb-1">
              {tx('Order No. (scan with barcode gun or type)', 'ऑर्डर नं. (स्कॅन गन वापरा किंवा टाईप करा)')}
            </label>
            <input
              id="manual-order"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              inputMode="numeric"
              autoComplete="off"
              placeholder="e.g. 14257"
              className="w-full border border-border-warm rounded-xl px-3.5 py-2.5 text-sm bg-ivory/50 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
            />
          </div>
          <div>
            <label htmlFor="handed-to" className="block text-xs font-semibold text-charcoal-light mb-1">
              {tx('Delivery Person / Carrier (saved)', 'डिलिव्हरी व्यक्तीचे नाव')}
            </label>
            <input
              id="handed-to"
              value={handedTo}
              onChange={(e) => setHandedTo(e.target.value)}
              placeholder={tx('e.g. Mahesh / Maruti Boy', 'उदा. महेश / मारुती बॉय')}
              className="w-full border border-border-warm rounded-xl px-3.5 py-2.5 text-sm bg-ivory/50 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
            />
          </div>
          <button
            type="submit"
            disabled={!manualCode.trim() || submitting}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-charcoal text-white text-sm font-semibold hover:bg-charcoal/90 disabled:opacity-40 transition-colors shadow-xs"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
            {tx('Mark Picked Up', 'पिकअप नोंदवा')}
          </button>
        </form>
      </div>

      {/* Main Records Table Card */}
      <div className="bg-white rounded-3xl border border-border-warm shadow-sm overflow-hidden">
        {/* Pipeline Stage Tabs */}
        <div className="border-b border-border-warm bg-ivory/40 p-2 sm:p-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <button
              onClick={() => setStatusTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                statusTab === 'all'
                  ? 'bg-charcoal text-white shadow-xs'
                  : 'bg-white text-charcoal-light hover:text-charcoal border border-border-warm'
              }`}
            >
              <span>{tx('All Orders', 'सर्व ऑर्डर्स')}</span>
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-black/10 text-inherit font-bold">
                {counts.all}
              </span>
            </button>

            <button
              onClick={() => setStatusTab('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                statusTab === 'pending'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-white text-charcoal-light hover:text-charcoal border border-border-warm'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{tx('🟡 Pending Pickup', '🟡 पिकअप बाकी')}</span>
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-black/10 text-inherit font-bold">
                {counts.pending}
              </span>
              {counts.delayed > 0 && (
                <span className="text-[10px] px-1 rounded bg-red-600 text-white font-bold">
                  {counts.delayed}!
                </span>
              )}
            </button>

            <button
              onClick={() => setStatusTab('picked_up')}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                statusTab === 'picked_up'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-white text-charcoal-light hover:text-charcoal border border-border-warm'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>{tx('🔵 Picked Up (At Hub)', '🔵 पिकअप झाले')}</span>
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-black/10 text-inherit font-bold">
                {counts.pickedUp}
              </span>
            </button>

            <button
              onClick={() => setStatusTab('dispatched')}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                statusTab === 'dispatched'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-charcoal-light hover:text-charcoal border border-border-warm'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{tx('🟢 Dispatched (Tracking Added)', '🟢 डिस्पॅच पूर्ण')}</span>
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-black/10 text-inherit font-bold">
                {counts.dispatched}
              </span>
            </button>
          </div>

          <button
            onClick={loadEntries}
            title={tx('Reload data', 'डेटा रिफ्रेश करा')}
            className="p-1.5 rounded-lg border border-border-warm text-charcoal-light hover:text-charcoal hover:bg-white"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Filters and search bar */}
        <div className="p-4 sm:p-5 border-b border-border-warm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-charcoal-light absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tx('Search Order, Name, Mobile, Docket…', 'ऑर्डर, नाव, मोबाईल, डॉकेट शोधा…')}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-border-warm rounded-xl focus:outline-none focus:border-gold"
              />
            </div>

            {/* Courier filter */}
            <select
              value={filterCourier}
              onChange={(e) => setFilterCourier(e.target.value)}
              className="text-xs sm:text-sm border border-border-warm rounded-xl px-3 py-2 bg-white text-charcoal focus:outline-none focus:border-gold"
            >
              <option value="all">{tx('All Couriers', 'सर्व कुरिअर्स')}</option>
              <option value="shree_maruti">Shree Maruti Courier</option>
              <option value="anjani">Anjani Courier</option>
              <option value="india_post">India Post</option>
              <option value="other">{tx('Other Courier', 'इतर कुरिअर')}</option>
            </select>

            {/* Date filter */}
            <div className="relative">
              <CalendarDays className="w-4 h-4 text-charcoal-light absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                aria-label={tx('Filter by date', 'तारखेनुसार फिल्टर')}
                className="pl-9 pr-3 py-2 text-xs sm:text-sm border border-border-warm rounded-xl focus:outline-none focus:border-gold"
              />
            </div>
            {filterDate && (
              <button onClick={() => setFilterDate('')} className="text-xs text-gold font-semibold hover:underline">
                {tx('Clear date', 'तारीख काढा')}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportCsv}
              disabled={visible.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-border-warm text-charcoal hover:border-gold hover:text-gold font-medium disabled:opacity-40 transition-colors"
            >
              <Download className="w-4 h-4" />
              {tx('Export CSV', 'CSV डाऊनलोड')}
            </button>
          </div>
        </div>

        {/* Status delay warning banner if in pending tab */}
        {statusTab === 'pending' && counts.delayed > 0 && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 text-xs text-red-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>
              {tx(
                `Attention: ${counts.delayed} parcel(s) were printed over 24-48 hours ago and have not been picked up yet! Please check packing / hold status.`,
                `लक्ष द्या: ${counts.delayed} पार्सल २४-४८ तासांपूर्वी प्रिंट झाले आहेत पण अजून पिकअप झालेले नाहीत! कृपया पॅकिंग किंवा होल्ड तपासा.`
              )}
            </span>
          </div>
        )}

        {/* Table Content */}
        {loading ? (
          <div className="p-12 text-center text-charcoal-light">
            <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2 text-gold" />
            {tx('Loading shipping records…', 'शिपिंग नोंदी लोड होत आहेत…')}
          </div>
        ) : loadError && !tableMissing ? (
          <div className="p-6 text-sm text-red-700">{loadError}</div>
        ) : visible.length === 0 ? (
          <div className="p-12 text-center text-sm text-charcoal-light">
            {entries.length === 0
              ? tx('No orders recorded yet. Generate labels from Address Print + QR or scan a label.', 'अजून कोणत्याही ऑर्डर्स नाहीत.')
              : tx('No records match your active filters.', 'या फिल्टरसाठी नोंदी नाहीत.')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="bg-ivory-dark/60 text-left text-[11px] uppercase tracking-wider text-charcoal-light border-b border-border-warm">
                  <th className="px-4 py-3 font-semibold">{tx('Order No', 'ऑर्डर नं.')}</th>
                  <th className="px-4 py-3 font-semibold">{tx('Customer', 'ग्राहक')}</th>
                  <th className="px-4 py-3 font-semibold">{tx('Status & Timing', 'स्थिती आणि वेळ')}</th>
                  <th className="px-4 py-3 font-semibold">{tx('Courier & Docket', 'कुरिअर आणि डॉकेट')}</th>
                  <th className="px-4 py-3 font-semibold">{tx('WhatsApp Tracking', 'व्हॉट्सॲप ट्रॅकिंग')}</th>
                  <th className="px-3 py-3 text-right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border-warm/80">
                {visible.map((e) => {
                  const effectiveStatus = e.status || (e.shipped_at ? 'picked_up' : 'pending');
                  const courierMeta = e.courier_partner ? COURIER_META[e.courier_partner] : null;
                  const elapsedPrinted = getTimeElapsed(e.printed_at || e.created_at);
                  const isDelayed = effectiveStatus === 'pending' && elapsedPrinted.hours >= 24;

                  return (
                    <tr
                      key={e.id}
                      className={`transition-colors duration-700 ${
                        highlightId === e.id
                          ? 'bg-gold/20'
                          : isDelayed
                          ? 'bg-red-50/40 hover:bg-red-50/70'
                          : 'hover:bg-ivory/50'
                      }`}
                    >
                      {/* Order Number & Printed Info */}
                      <td className="px-4 py-3 align-top">
                        <div className="font-mono font-bold text-charcoal text-sm sm:text-base">
                          #{e.order_number}
                        </div>
                        <div className="text-[11px] text-charcoal-light mt-0.5">
                          {tx('Printed', 'प्रिंट')}: {elapsedPrinted.text}
                        </div>
                        {e.handed_to && (
                          <div className="text-[10px] text-charcoal-light/80 mt-0.5">
                            {tx('Carrier', 'वाहक')}: <span className="font-medium text-charcoal">{e.handed_to}</span>
                          </div>
                        )}
                      </td>

                      {/* Customer Details */}
                      <td className="px-4 py-3 align-top max-w-[200px]">
                        <div className="font-semibold text-charcoal truncate">
                          {e.customer_name || '—'}
                        </div>
                        {e.customer_mobile && (
                          <div className="text-xs font-mono text-charcoal-light mt-0.5">
                            {e.customer_mobile}
                          </div>
                        )}
                        {(e.customer_city || e.customer_pincode) && (
                          <div className="text-[11px] text-charcoal-light truncate mt-0.5">
                            {[e.customer_city, e.customer_pincode].filter(Boolean).join(' - ')}
                          </div>
                        )}
                      </td>

                      {/* Status & Timing */}
                      <td className="px-4 py-3 align-top">
                        {effectiveStatus === 'pending' && (
                          <div className="space-y-1">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                                isDelayed
                                  ? 'bg-red-100 text-red-800 border-red-300'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              {isDelayed
                                ? tx(`Delayed (${elapsedPrinted.text})`, `उशीर (${elapsedPrinted.text})`)
                                : tx('Pending Pickup', 'पिकअप बाकी')}
                            </span>
                            <div className="text-[10px] text-charcoal-light">
                              {tx('Awaiting courier pickup', 'कुरिअर पिकअपची प्रतीक्षा')}
                            </div>
                          </div>
                        )}

                        {effectiveStatus === 'picked_up' && (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-800 border border-sky-200">
                              <Truck className="w-3 h-3" />
                              {tx('Picked Up (Hub)', 'पिकअप झाले')}
                            </span>
                            <div className="text-[10px] text-charcoal-light">
                              {formatShippedAt(e.shipped_at)}
                            </div>
                          </div>
                        )}

                        {effectiveStatus === 'dispatched' && (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              {tx('Dispatched', 'डिस्पॅच पूर्ण')}
                            </span>
                            <div className="text-[10px] text-charcoal-light">
                              {formatShippedAt(e.shipped_at || e.created_at)}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Courier & Docket info */}
                      <td className="px-4 py-3 align-top min-w-[210px]">
                        {e.courier_partner ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${courierMeta?.badgeBg} ${courierMeta?.badgeBorder} ${courierMeta?.badgeText}`}
                              >
                                {isMr ? courierMeta?.nameMr : courierMeta?.name}
                              </span>
                            </div>

                            {e.tracking_number ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-bold text-charcoal bg-ivory-dark/60 px-2 py-0.5 rounded border border-border-warm">
                                  {e.tracking_number}
                                </span>
                                {e.tracking_url && (
                                  <a
                                    href={e.tracking_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-gold hover:underline inline-flex items-center gap-0.5 font-medium"
                                  >
                                    <span>{tx('Track', 'ट्रॅक')}</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            ) : (
                              <div className="text-[11px] text-amber-700 italic">
                                {tx('Awaiting docket no.', 'डॉकेट नंबर बाकी')}
                              </div>
                            )}

                            {/* Docket photo thumbnail if available */}
                            {e.docket_photo_url && (
                              <div className="pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => setViewingPhotoUrl(e.docket_photo_url)}
                                  className="inline-flex items-center gap-1 text-[11px] text-charcoal-light hover:text-gold transition-colors"
                                >
                                  <ImageIcon className="w-3 h-3 text-gold" />
                                  <span>{tx('View Docket Photo', 'डॉकेट फोटो पहा')}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openEditModal(e)}
                            className="inline-flex items-center gap-1 text-xs text-gold hover:underline font-semibold"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>{tx('+ Assign Courier & Docket', '+ कुरिअर व डॉकेट जोडा')}</span>
                          </button>
                        )}

                        {/* Quick edit button if already assigned */}
                        {e.courier_partner && (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(e)}
                              className="text-[10px] text-charcoal-light hover:text-gold underline"
                            >
                              {tx('Edit details', 'बदला')}
                            </button>
                          </div>
                        )}
                      </td>

                      {/* 1-Click WhatsApp Button */}
                      <td className="px-4 py-3 align-top min-w-[170px]">
                        {e.customer_mobile ? (
                          <div className="space-y-1.5">
                            <button
                              type="button"
                              onClick={() => handleSendWhatsApp(e)}
                              className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-xs ${
                                e.whatsapp_sent
                                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              }`}
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>
                                {e.whatsapp_sent
                                  ? tx('✓ Sent (Resend)', '✓ पाठवले (पुन्हा)')
                                  : tx('Send Tracking', 'ट्रॅकिंग पाठवा')}
                              </span>
                            </button>
                            {e.whatsapp_sent && (
                              <div className="text-[10px] text-emerald-700 text-center font-medium">
                                {tx('Tracking link sent to WhatsApp', 'व्हॉट्सॲपवर पाठवले')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-charcoal-light/70 italic">
                            {tx('No mobile on label', 'मोबाईल नंबर नाही')}
                          </span>
                        )}
                      </td>

                      {/* Delete action */}
                      <td className="px-3 py-3 align-top text-right">
                        <button
                          onClick={() => handleDelete(e)}
                          className="p-1 text-charcoal-light hover:text-red-600 rounded-lg transition-colors"
                          title={tx('Remove record', 'काढून टाका')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Courier & Docket Modal */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 border border-border-warm shadow-xl">
            <div className="flex items-center justify-between border-b border-border-warm pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-charcoal">
                  {tx('Assign Courier & Docket', 'कुरिअर आणि डॉकेट जोडा')}
                </h3>
                <p className="text-xs text-charcoal-light">
                  {tx('Order', 'ऑर्डर')} #{editingEntry.order_number} · {editingEntry.customer_name || 'Customer'}
                </p>
              </div>
              <button
                onClick={() => setEditingEntry(null)}
                className="p-1 rounded-lg text-charcoal-light hover:text-charcoal hover:bg-ivory"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              {/* Courier Partner Selection */}
              <div>
                <label className="block font-semibold text-charcoal mb-1.5">
                  {tx('Courier Service Partner', 'कुरिअर कंपनी')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['shree_maruti', 'anjani', 'india_post', 'other'] as CourierPartner[]).map((p) => {
                    const meta = COURIER_META[p];
                    const isSelected = editCourier === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setEditCourier(p)}
                        className={`p-2.5 rounded-xl border text-left font-medium transition-all ${
                          isSelected
                            ? 'border-gold bg-gold/10 text-charcoal shadow-xs'
                            : 'border-border-warm bg-white hover:bg-ivory/60 text-charcoal-light'
                        }`}
                      >
                        <div className="font-semibold text-charcoal">{meta.name}</div>
                        <div className="text-[10px] text-charcoal-light mt-0.5">
                          {isMr ? meta.nameMr : meta.website.replace('https://', '').replace('http://', '')}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Docket / Barcode Number */}
              <div>
                <label htmlFor="edit-docket" className="block font-semibold text-charcoal mb-1.5">
                  {tx('Docket / Barcode / Consignment No.', 'डॉकेट / बारकोड नंबर')}
                </label>
                <input
                  id="edit-docket"
                  value={editDocket}
                  onChange={(e) => setEditDocket(e.target.value)}
                  placeholder={
                    editCourier === 'india_post'
                      ? 'e.g. EM123456789IN'
                      : editCourier === 'anjani'
                      ? 'e.g. ANJ894204'
                      : 'e.g. 5204892'
                  }
                  className="w-full border border-border-warm rounded-xl px-3.5 py-2.5 bg-ivory/40 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 font-mono"
                />
              </div>

              {/* Auto Generated Tracking Link Preview */}
              {editDocket.trim() && (
                <div className="p-3 rounded-xl bg-ivory border border-border-warm space-y-1">
                  <div className="text-[11px] font-semibold text-charcoal-light uppercase tracking-wider">
                    {tx('Generated Tracking Link Preview', 'तयार झालेली ट्रॅकिंग लिंक')}
                  </div>
                  <div className="text-xs font-mono text-gold break-all">
                    {COURIER_META[editCourier].getTrackingUrl(editDocket)}
                  </div>
                </div>
              )}

              {/* Docket Photo Upload or URL */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-charcoal">
                    {tx('Parcel / Docket Photo (from WhatsApp)', 'पार्सल / डॉकेट फोटो')}
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="text-xs font-semibold text-gold hover:underline inline-flex items-center gap-1"
                  >
                    {uploadingPhoto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    <span>{tx('Upload Photo', 'फोटो अपलोड करा')}</span>
                  </button>
                </div>
                <input
                  value={editPhotoUrl}
                  onChange={(e) => setEditPhotoUrl(e.target.value)}
                  placeholder={tx('Paste image URL or upload above', 'इमेज URL पेस्ट करा किंवा वरून अपलोड करा')}
                  className="w-full border border-border-warm rounded-xl px-3.5 py-2 text-xs bg-ivory/40 focus:outline-none focus:border-gold"
                />
                {editPhotoUrl && (
                  <div className="mt-2 relative w-20 h-20 rounded-lg overflow-hidden border border-border-warm bg-black/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={editPhotoUrl}
                      alt="Docket preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setEditPhotoUrl('')}
                      className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-warm">
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-charcoal-light hover:bg-ivory"
              >
                {tx('Cancel', 'रद्द करा')}
              </button>
              <button
                type="button"
                onClick={handleSaveTracking}
                disabled={savingEdit}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-charcoal text-white text-xs font-semibold hover:bg-charcoal/90 disabled:opacity-40 shadow-xs"
              >
                {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>{tx('Save & Update', 'सेव्ह करा')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Size Photo Viewer Modal */}
      {viewingPhotoUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-2xl max-h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2">
            <button
              onClick={() => setViewingPhotoUrl(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/70 text-white hover:bg-black"
            >
              <X className="w-5 h-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={viewingPhotoUrl}
              alt="Docket photo"
              className="max-h-[80vh] w-auto mx-auto object-contain rounded-xl"
            />
          </div>
        </div>
      )}

      {/* Footer Navigation */}
      <div className="text-center pt-2">
        <Link
          href="/admin/shipping-printer"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gold hover:underline"
        >
          <Printer className="w-4 h-4" />
          {tx('Go to Address Print + QR', 'पत्ता प्रिंट + QR कडे जा')}
        </Link>
      </div>
    </div>
  );
}
