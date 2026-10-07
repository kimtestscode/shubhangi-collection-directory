'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ScanLine, Camera, CameraOff, Download, Trash2, Search, CheckCircle2,
  AlertTriangle, XCircle, Loader2, PackageCheck, CalendarDays, Printer, Truck,
} from 'lucide-react';
import { useLanguage } from '@/lib/languageContext';
import { ShippingEntry, formatShippedAt, istDateKey } from '@/lib/shipping';

type Feedback =
  | { kind: 'success'; order: string; at: string }
  | { kind: 'duplicate'; order: string; at: string }
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

  const [manualCode, setManualCode] = useState('');
  const [handedTo, setHandedTo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const handedToRef = useRef('');
  const lastScanRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });
  const busyRef = useRef(false);

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
        setEntries((prev) => [entry, ...prev]);
        setFeedback({ kind: 'success', order: entry.order_number, at: entry.shipped_at });
        beep(880);
        navigator.vibrate?.(80);
      } else {
        setFeedback({ kind: 'duplicate', order: entry.order_number, at: entry.shipped_at });
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

  // The camera callback is created once; keep it pointing at the latest submit function.
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
            ? tx('Camera permission was blocked. Allow camera access in the browser and try again.', 'कॅमेराची परवानगी नाकारली गेली. ब्राउझरमध्ये कॅमेरा परवानगी द्या आणि पुन्हा प्रयत्न करा.')
            : tx('Could not start the camera. It needs HTTPS and a device with a camera.', 'कॅमेरा सुरू होऊ शकला नाही. HTTPS आणि कॅमेरा आवश्यक आहे.'),
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
    // Typed/hardware-scanned entry should always go through, even if repeated.
    lastScanRef.current = { code: '', time: 0 };
    submitOrder(code);
  }

  async function handleDelete(entry: ShippingEntry) {
    const ok = window.confirm(
      tx(`Remove order ${entry.order_number} from the shipping master?`, `ऑर्डर ${entry.order_number} शिपिंग मास्टरमधून काढायचा?`),
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

  // ─── derived data ─────────────────────────────────────────────────────────
  const todayKey = istDateKey(new Date());
  const todayCount = useMemo(
    () => entries.filter((e) => istDateKey(e.shipped_at) === todayKey).length,
    [entries, todayKey],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (filterDate && istDateKey(e.shipped_at) !== filterDate) return false;
      if (!q) return true;
      return e.order_number.toLowerCase().includes(q) || (e.handed_to ?? '').toLowerCase().includes(q);
    });
  }, [entries, search, filterDate]);

  function exportCsv() {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows = [['Order No', 'Shipped Date', 'Shipped Time', 'Handed To']];
    for (const e of visible) {
      const d = new Date(e.shipped_at);
      rows.push([
        e.order_number,
        d.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' }),
        d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' }),
        e.handed_to ?? '',
      ]);
    }
    const csv = rows.map((r) => r.map(esc).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shipping-master-${filterDate || todayKey}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const tableMissing = /shipping_master/i.test(loadError);

  // ─── UI ───────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="bg-gradient-to-r from-charcoal to-charcoal/90 text-ivory p-5 sm:p-7 rounded-3xl shadow-lg border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/20 text-gold text-[11px] font-semibold border border-gold/30">
            <Truck className="w-3.5 h-3.5" />
            {tx('Pickup Scan · Beta', 'पिकअप स्कॅन · Beta')}
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white">
            {tx('Order Shipping Master', 'ऑर्डर शिपिंग मास्टर')}
          </h1>
          <p className="text-sm text-ivory/75 max-w-xl">
            {tx(
              'Scan the QR on each parcel label when the delivery person collects it. The date and time are saved automatically.',
              'डिलिव्हरी व्यक्ती पार्सल घेऊन जाताना प्रत्येक लेबलवरील QR स्कॅन करा. तारीख आणि वेळ आपोआप सेव्ह होते.',
            )}
          </p>
        </div>
        <div className="flex sm:flex-col gap-2 sm:items-end">
          <div className="bg-white/10 rounded-2xl px-4 py-2 text-center min-w-[96px]">
            <div className="text-2xl font-bold text-gold leading-none">{todayCount}</div>
            <div className="text-[10px] uppercase tracking-wider text-ivory/70 mt-1">{tx('Shipped today', 'आज पाठवले')}</div>
          </div>
          <div className="bg-white/10 rounded-2xl px-4 py-2 text-center min-w-[96px]">
            <div className="text-2xl font-bold text-white leading-none">{entries.length}</div>
            <div className="text-[10px] uppercase tracking-wider text-ivory/70 mt-1">{tx('Total logged', 'एकूण नोंदी')}</div>
          </div>
        </div>
      </div>

      {tableMissing && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl p-4 text-sm space-y-1">
          <div className="font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {tx('One-time database setup needed', 'एकदाच डेटाबेस सेटअप आवश्यक')}
          </div>
          <p>
            {tx(
              'Open Supabase → SQL Editor, paste the contents of supabase/shipping_master.sql and run it. Then reload this page.',
              'Supabase → SQL Editor उघडा, supabase/shipping_master.sql मधील मजकूर पेस्ट करून Run करा. नंतर हे पेज रिलोड करा.',
            )}
          </p>
        </div>
      )}

      {/* Scan card */}
      <div className="bg-white rounded-3xl border border-border-warm shadow-sm p-5 sm:p-7 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-lg font-bold text-charcoal flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-gold" />
            {tx('Scan parcels', 'पार्सल स्कॅन करा')}
          </h2>
          <button
            type="button"
            onClick={toggleCamera}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              cameraOn ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gold text-white hover:bg-gold/90'
            }`}
          >
            {cameraOn ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
            {cameraOn ? tx('Stop camera', 'कॅमेरा बंद करा') : tx('Start camera scan', 'कॅमेरा स्कॅन सुरू करा')}
          </button>
        </div>

        {cameraError && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{cameraError}</p>
        )}

        {/* Always mounted so html5-qrcode can find it; only visible while scanning */}
        <div
          id="qr-reader"
          className={cameraOn ? 'w-full max-w-sm mx-auto rounded-2xl overflow-hidden border-2 border-gold/50' : 'hidden'}
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
            {feedback.kind === 'success' && <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />}
            {feedback.kind === 'duplicate' && <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />}
            {feedback.kind === 'error' && <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />}
            <div className="text-sm">
              {feedback.kind === 'success' && (
                <>
                  <div className="font-bold text-base">{tx('Order', 'ऑर्डर')} {feedback.order} {tx('logged ✓', 'नोंदवला ✓')}</div>
                  <div>{formatShippedAt(feedback.at)}</div>
                </>
              )}
              {feedback.kind === 'duplicate' && (
                <>
                  <div className="font-bold text-base">{tx('Order', 'ऑर्डर')} {feedback.order} {tx('was already shipped', 'आधीच पाठवला आहे')}</div>
                  <div>{tx('First scanned', 'पहिल्यांदा स्कॅन')}: {formatShippedAt(feedback.at)} — {tx('no duplicate entry created', 'डुप्लिकेट नोंद केली नाही')}</div>
                </>
              )}
              {feedback.kind === 'error' && (
                <>
                  <div className="font-bold text-base">{tx('Could not save', 'सेव्ह होऊ शकले नाही')}</div>
                  <div>{feedback.message}</div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Manual / hardware scanner entry */}
        <form onSubmit={handleManualSubmit} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div>
            <label htmlFor="manual-order" className="block text-xs font-semibold text-charcoal-light mb-1">
              {tx('Order no. (type, or use a USB / Bluetooth scanner)', 'ऑर्डर नं. (टाईप करा किंवा USB / Bluetooth स्कॅनर वापरा)')}
            </label>
            <input
              id="manual-order"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              inputMode="numeric"
              autoComplete="off"
              placeholder="14257"
              className="w-full border border-border-warm rounded-xl px-3 py-2.5 text-sm bg-ivory/50 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
            />
          </div>
          <div>
            <label htmlFor="handed-to" className="block text-xs font-semibold text-charcoal-light mb-1">
              {tx('Handed to (optional)', 'कोणाला दिले (ऐच्छिक)')}
            </label>
            <input
              id="handed-to"
              value={handedTo}
              onChange={(e) => setHandedTo(e.target.value)}
              placeholder={tx('Delivery person / courier', 'डिलिव्हरी व्यक्ती / कुरिअर')}
              className="w-full border border-border-warm rounded-xl px-3 py-2.5 text-sm bg-ivory/50 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
            />
          </div>
          <button
            type="submit"
            disabled={!manualCode.trim() || submitting}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-charcoal text-white text-sm font-semibold hover:bg-charcoal/90 disabled:opacity-40"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
            {tx('Mark shipped', 'पाठवले नोंदवा')}
          </button>
        </form>
      </div>

      {/* Master table */}
      <div className="bg-white rounded-3xl border border-border-warm shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border-warm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-charcoal">{tx('Shipping records', 'शिपिंग नोंदी')}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-charcoal-light absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tx('Search order no.', 'ऑर्डर नं. शोधा')}
                className="pl-9 pr-3 py-2 text-sm border border-border-warm rounded-xl w-44 focus:outline-none focus:border-gold"
              />
            </div>
            <div className="relative">
              <CalendarDays className="w-4 h-4 text-charcoal-light absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                aria-label={tx('Filter by date', 'तारखेनुसार फिल्टर')}
                className="pl-9 pr-3 py-2 text-sm border border-border-warm rounded-xl focus:outline-none focus:border-gold"
              />
            </div>
            {filterDate && (
              <button onClick={() => setFilterDate('')} className="text-xs text-gold font-semibold hover:underline">
                {tx('All dates', 'सर्व तारखा')}
              </button>
            )}
            <button
              onClick={exportCsv}
              disabled={visible.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm rounded-xl border border-border-warm text-charcoal hover:border-gold hover:text-gold font-medium disabled:opacity-40"
            >
              <Download className="w-4 h-4" />
              {tx('Export CSV', 'CSV डाऊनलोड')}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-charcoal-light">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-gold" />
            {tx('Loading…', 'लोड होत आहे…')}
          </div>
        ) : loadError && !tableMissing ? (
          <div className="p-6 text-sm text-red-700">{loadError}</div>
        ) : visible.length === 0 ? (
          <div className="p-10 text-center text-sm text-charcoal-light">
            {entries.length === 0
              ? tx('No parcels scanned yet. Scan a label above to create the first entry.', 'अजून कोणतेही पार्सल स्कॅन केलेले नाही. पहिली नोंद करण्यासाठी वर लेबल स्कॅन करा.')
              : tx('No records match this filter.', 'या फिल्टरसाठी नोंदी नाहीत.')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-ivory-dark/60 text-left text-xs uppercase tracking-wider text-charcoal-light">
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">{tx('Order no.', 'ऑर्डर नं.')}</th>
                  <th className="px-4 py-3 font-semibold">{tx('Shipped on', 'पाठवल्याची तारीख')}</th>
                  <th className="px-4 py-3 font-semibold">{tx('Handed to', 'कोणाला दिले')}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {visible.map((e, i) => (
                  <tr
                    key={e.id}
                    className={`border-t border-border-warm transition-colors duration-700 ${
                      highlightId === e.id ? 'bg-gold/20' : 'hover:bg-ivory/60'
                    }`}
                  >
                    <td className="px-4 py-2.5 text-charcoal-light">{visible.length - i}</td>
                    <td className="px-4 py-2.5 font-mono font-bold text-charcoal">{e.order_number}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{formatShippedAt(e.shipped_at)}</td>
                    <td className="px-4 py-2.5 text-charcoal-light">{e.handed_to || '—'}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => handleDelete(e)}
                        className="p-1.5 text-charcoal-light hover:text-red-600 rounded-lg"
                        title={tx('Remove (undo a wrong scan)', 'काढून टाका (चुकीचा स्कॅन)')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-center">
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
