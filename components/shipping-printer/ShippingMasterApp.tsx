'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ScanLine, Camera, CameraOff, Download, Trash2, Search, CheckCircle2,
  AlertTriangle, XCircle, Loader2, PackageCheck, CalendarDays, Calendar, Printer, Truck,
  ExternalLink, MessageCircle, Upload, Image as ImageIcon, Clock, Edit3, Check,
  X, ChevronDown, Sparkles, AlertCircle, RefreshCw, CheckSquare, Square, Layers, Eraser
} from 'lucide-react';
import { useLanguage } from '@/lib/languageContext';
import {
  ShippingEntry, ShippingStatus, CourierPartner, COURIER_META,
  formatShippedAt, istDateKey, getTimeElapsed, getWhatsAppUrl,
  cleanMobileNumber, buildWhatsAppTrackingMessage
} from '@/lib/shipping';
import { Order } from '@/lib/address-printer/order';
import ShippingPrintPreview from './ShippingPrintPreview';

export interface PrintBundle {
  id: string;
  dateKey: string;
  timeLabel: string;
  dateLabel: string;
  displayName: string;
  orderIds: string[];
  orderNumbers: string[];
  count: number;
  timestamp: number;
}

function entryToOrder(e: ShippingEntry): Order {
  return {
    id: e.id,
    orderNumber: e.order_number,
    to: {
      name: e.customer_name || 'Customer',
      address: e.customer_address || '',
      city: e.customer_city || '',
      pincode: e.customer_pincode || '',
      mobile: e.customer_mobile || '',
    },
    from: {
      rawBlock: 'Shubhangi Collection',
    },
    rawText: [
      e.customer_name,
      e.customer_mobile,
      e.customer_address,
      e.customer_city,
      e.customer_pincode,
    ]
      .filter(Boolean)
      .join('\n'),
    warnings: [],
  };
}

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

  // Helper for dates in local YYYY-MM-DD
  const getTodayDateStr = useCallback(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const getYesterdayDateStr = useCallback(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Ongoing pickup date state - Defaults to current ongoing date!
  const [pickupDate, setPickupDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const pickupDateRef = useRef(pickupDate);
  useEffect(() => {
    pickupDateRef.current = pickupDate;
  }, [pickupDate]);

  const isBackDated = pickupDate !== getTodayDateStr();

  // Edit Tracking Modal / Drawer state
  const [editingEntry, setEditingEntry] = useState<ShippingEntry | null>(null);
  const [editCourier, setEditCourier] = useState<CourierPartner>('shree_maruti');
  const [editDocket, setEditDocket] = useState('');
  const [editShippingCost, setEditShippingCost] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [editShippedAt, setEditShippedAt] = useState('');
  const [editStatus, setEditStatus] = useState<ShippingStatus>('picked_up');
  const [editHandedTo, setEditHandedTo] = useState('');
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerMobile, setEditCustomerMobile] = useState('');
  const [editCustomerAddress, setEditCustomerAddress] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkDateModalOpen, setBulkDateModalOpen] = useState(false);
  const [bulkTargetDate, setBulkTargetDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  // Bundle Filtering & Bulk Reprint State
  const [selectedBundleId, setSelectedBundleId] = useState<string>('');
  const [reprintModalOpen, setReprintModalOpen] = useState(false);
  const [reprintOrders, setReprintOrders] = useState<Order[]>([]);

  // Batch Multi-Scan Input State
  const [isBatchScanOpen, setIsBatchScanOpen] = useState(false);
  const [batchOrdersText, setBatchOrdersText] = useState('');
  const [submittingBatch, setSubmittingBatch] = useState(false);

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
      const chosenDate = pickupDateRef.current;
      const todayStr = getTodayDateStr();
      let shippedAtIso: string | undefined = undefined;
      if (chosenDate && chosenDate !== todayStr) {
        const now = new Date();
        const [y, m, d] = chosenDate.split('-').map(Number);
        const customDate = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
        shippedAtIso = customDate.toISOString();
      } else {
        shippedAtIso = new Date().toISOString();
      }

      const res = await fetch('/api/shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_number: code,
          handed_to: handedToRef.current,
          shipped_at: shippedAtIso,
          force_update: true,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to save');

      const entry: ShippingEntry = body.entry;
      if (body.status === 'created' || body.status === 'updated') {
        setEntries((prev) => {
          const filtered = prev.filter((x) => x.id !== entry.id);
          return [entry, ...filtered];
        });
        setFeedback({
          kind: 'success',
          order: entry.order_number,
          at: entry.shipped_at || undefined,
          note: body.status === 'updated' ? tx('Pickup date updated ✓', 'पिकअप तारीख बदलली ✓') : undefined,
        });
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
  }, [tx]);

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
      tx(
        `Are you sure you want to permanently delete order #${entry.order_number} from shipping master?`,
        `ऑर्डर #${entry.order_number} शिपिंग मास्टरमधून कायमची हटवायची आहे का?`
      ),
    );
    if (!ok) return;
    const res = await fetch(`/api/shipping/${entry.id}`, { method: 'DELETE' });
    if (res.ok) {
      setEntries((prev) => prev.filter((x) => x.id !== entry.id));
      setSelectedIds((prev) => prev.filter((id) => id !== entry.id));
      lastScanRef.current = { code: '', time: 0 };
      if (editingEntry?.id === entry.id) setEditingEntry(null);
    } else {
      const body = await res.json().catch(() => ({}));
      setFeedback({ kind: 'error', message: body.error || 'Failed to remove' });
    }
  }

  // 1-Click Clear Address for single order
  async function handleClearAddressSingle(entry: ShippingEntry) {
    if (
      !window.confirm(
        tx(
          `Clear customer address for Order #${entry.order_number}? (The order record remains in shipping master)`,
          `ऑर्डर #${entry.order_number} चा पत्ता काढून टाकायचा का? (ऑर्डर क्रमांक तसाच राहील)`
        )
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/shipping/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_address: null,
          customer_city: null,
          customer_pincode: null,
        }),
      });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error || 'Failed to clear address');
      setEntries((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      beep(880, 80);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error clearing address');
    }
  }

  // ─── Bulk & Batch Actions ─────────────────────────────────────────────────
  function handleToggleSelectAll(filteredEntries: ShippingEntry[]) {
    const visibleIds = filteredEntries.map((e) => e.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  }

  function handleToggleSelectOne(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  async function handleBulkClearAddresses() {
    if (selectedIds.length === 0) return;
    if (
      !window.confirm(
        tx(
          `Clear customer address details on ${selectedIds.length} selected orders?`,
          `निवडलेल्या ${selectedIds.length} ऑर्डर्सचे पत्ते काढून टाकायचे आहेत का?`
        )
      )
    ) {
      return;
    }
    setBulkBusy(true);
    try {
      const res = await fetch('/api/shipping/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_addresses', ids: selectedIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to clear addresses');
      const updatedMap = new Map((data.updated || []).map((u: ShippingEntry) => [u.id, u]));
      setEntries((prev) =>
        prev.map((e) => (updatedMap.has(e.id) ? (updatedMap.get(e.id) as ShippingEntry) : e))
      );
      setSelectedIds([]);
      beep(880, 100);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error clearing addresses');
    } finally {
      setBulkBusy(false);
    }
  }

  function handleBulkPrintAgain() {
    const selectedEntries = entries.filter((e) => selectedIds.includes(e.id));
    if (selectedEntries.length === 0) {
      alert(
        tx(
          'Please select at least 1 order to print.',
          'कृपया प्रिंट करण्यासाठी किमान 1 ऑर्डर निवडा.'
        )
      );
      return;
    }
    const ordersToPrint = selectedEntries.map(entryToOrder);
    setReprintOrders(ordersToPrint);
    setReprintModalOpen(true);
  }

  function handlePrintSingle(entry: ShippingEntry) {
    setReprintOrders([entryToOrder(entry)]);
    setReprintModalOpen(true);
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;
    if (
      !window.confirm(
        tx(
          `DELETE CONFIRMATION: Permanently delete ${selectedIds.length} selected orders from Shipping Master?`,
          `सावधान: निवडलेले ${selectedIds.length} ऑर्डर्स शिपिंग मास्टरमधून कायमचे हटवायचे आहेत का?`
        )
      )
    ) {
      return;
    }
    setBulkBusy(true);
    try {
      const res = await fetch('/api/shipping/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_entries', ids: selectedIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete entries');
      const idSet = new Set(selectedIds);
      setEntries((prev) => prev.filter((e) => !idSet.has(e.id)));
      setSelectedIds([]);
      beep(400, 100);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error deleting entries');
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleBulkUpdateDates(targetDateStr: string) {
    if (selectedIds.length === 0) return;
    setBulkBusy(true);
    try {
      const now = new Date();
      const [y, m, d] = targetDateStr.split('-').map(Number);
      const targetDate = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
      const shippedAtIso = targetDate.toISOString();

      const res = await fetch('/api/shipping/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_dates',
          ids: selectedIds,
          shipped_at: shippedAtIso,
          handed_to: handedToRef.current,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update dates');

      const updatedMap = new Map((data.updated || []).map((u: ShippingEntry) => [u.id, u]));
      setEntries((prev) =>
        prev.map((e) => (updatedMap.has(e.id) ? (updatedMap.get(e.id) as ShippingEntry) : e))
      );
      setSelectedIds([]);
      setBulkDateModalOpen(false);
      beep(880, 100);
      setFeedback({
        kind: 'success',
        order: `${data.count} orders`,
        at: shippedAtIso,
        note: tx(`Pickup date updated to ${targetDateStr} ✓`, `पिकअप तारीख ${targetDateStr} वर सेट झाली ✓`),
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error updating pickup dates');
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleBatchOrdersSubmit() {
    const rawTokens = batchOrdersText
      .split(/[\n,\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    if (rawTokens.length === 0) return;

    setSubmittingBatch(true);
    try {
      const chosenDate = pickupDateRef.current;
      const todayStr = getTodayDateStr();
      let shippedAtIso: string;
      if (chosenDate && chosenDate !== todayStr) {
        const now = new Date();
        const [y, m, d] = chosenDate.split('-').map(Number);
        const customDate = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
        shippedAtIso = customDate.toISOString();
      } else {
        shippedAtIso = new Date().toISOString();
      }

      const res = await fetch('/api/shipping/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_dates',
          order_numbers: rawTokens,
          shipped_at: shippedAtIso,
          handed_to: handedToRef.current,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Batch update failed');

      if (data.updated && data.updated.length > 0) {
        const updatedMap = new Map(data.updated.map((u: ShippingEntry) => [u.id, u]));
        setEntries((prev) => {
          const remaining = prev.filter((e) => !updatedMap.has(e.id));
          return [...data.updated, ...remaining];
        });
      }

      setBatchOrdersText('');
      setIsBatchScanOpen(false);
      beep(880, 120);
      setFeedback({
        kind: 'success',
        order: `${data.count} orders`,
        at: shippedAtIso,
        note: tx(`Bulk pickup recorded (${chosenDate}) ✓`, `एकत्र पिकअप नोंद झाली (${chosenDate}) ✓`),
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Batch scan error');
    } finally {
      setSubmittingBatch(false);
    }
  }

  // ─── Courier & Tracking Modal ─────────────────────────────────────────────
  function openEditModal(entry: ShippingEntry) {
    setEditingEntry(entry);
    setEditCourier(entry.courier_partner || 'shree_maruti');
    setEditDocket(entry.tracking_number || '');
    setEditShippingCost(entry.shipping_cost ? String(entry.shipping_cost) : '');
    setEditPhotoUrl(entry.docket_photo_url || '');
    setEditStatus(entry.status || (entry.shipped_at ? 'picked_up' : 'pending'));
    setEditHandedTo(entry.handed_to || '');
    setEditCustomerName(entry.customer_name || '');
    setEditCustomerMobile(entry.customer_mobile || '');
    setEditCustomerAddress(entry.customer_address || '');
    if (entry.shipped_at) {
      const d = new Date(entry.shipped_at);
      const pad = (n: number) => String(n).padStart(2, '0');
      setEditShippedAt(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
    } else {
      setEditShippedAt('');
    }
  }

  async function handleSaveTracking() {
    if (!editingEntry) return;
    setSavingEdit(true);
    try {
      const partnerMeta = COURIER_META[editCourier];
      const trackingUrl = partnerMeta ? partnerMeta.getTrackingUrl(editDocket) : '';

      let resolvedShippedAt: string | null = editingEntry.shipped_at;
      if (editShippedAt) {
        resolvedShippedAt = new Date(editShippedAt).toISOString();
      } else if (editStatus === 'pending') {
        resolvedShippedAt = null;
      }

      const res = await fetch(`/api/shipping/${editingEntry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courier_partner: editCourier,
          tracking_number: editDocket.trim(),
          tracking_url: trackingUrl,
          shipping_cost: editShippingCost === '' ? null : Number(editShippingCost),
          docket_photo_url: editPhotoUrl.trim() || null,
          status: editDocket.trim() ? 'dispatched' : editStatus,
          handed_to: editHandedTo.trim() || null,
          shipped_at: resolvedShippedAt,
          customer_name: editCustomerName.trim() || null,
          customer_mobile: editCustomerMobile.trim() || null,
          customer_address: editCustomerAddress.trim() || null,
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
    if (!entry.courier_partner) {
      alert(
        tx(
          'Please assign a courier partner (Logistics company) before sending tracking to the customer.',
          'ग्राहकाला ट्रॅकिंग पाठवण्यापूर्वी आधी कुरिअर कंपनी निवडा.'
        )
      );
      openEditModal(entry);
      return;
    }

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
    let totalShippingCost = 0;

    for (const e of entries) {
      if (e.shipping_cost) totalShippingCost += Number(e.shipping_cost);
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
    return { all: entries.length, pending, pickedUp, dispatched, delayed, totalShippingCost };
  }, [entries]);

  // ─── Print Bundles & Batches Clustering ───────────────────────────────────
  const bundles = useMemo<PrintBundle[]>(() => {
    // Sort all entries by timestamp (printed_at || created_at) descending
    const sorted = [...entries]
      .filter((e) => Boolean(e.printed_at || e.created_at))
      .sort((a, b) => {
        const timeA = new Date(a.printed_at || a.created_at).getTime();
        const timeB = new Date(b.printed_at || b.created_at).getTime();
        return timeB - timeA;
      });

    if (sorted.length === 0) return [];

    const clusters: ShippingEntry[][] = [];
    let currentCluster: ShippingEntry[] = [];
    let lastTime: number | null = null;
    let lastDateKey: string | null = null;

    // A bundle represents a paste/print session. Orders pasted together have near-identical timestamps.
    // 15-minute clustering window within the same calendar date.
    const CLUSTER_WINDOW_MS = 15 * 60 * 1000;

    for (const entry of sorted) {
      const rawDate = entry.printed_at || entry.created_at;
      const t = new Date(rawDate).getTime();
      const dKey = istDateKey(rawDate);

      if (
        lastTime === null ||
        (lastDateKey === dKey && Math.abs(lastTime - t) <= CLUSTER_WINDOW_MS)
      ) {
        currentCluster.push(entry);
      } else {
        if (currentCluster.length > 0) {
          clusters.push(currentCluster);
        }
        currentCluster = [entry];
      }
      lastTime = t;
      lastDateKey = dKey;
    }
    if (currentCluster.length > 0) {
      clusters.push(currentCluster);
    }

    const now = new Date();
    const todayStr = istDateKey(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yestStr = istDateKey(yesterday);

    return clusters.map((cluster, idx) => {
      const first = cluster[0];
      const rawDate = first.printed_at || first.created_at;
      const timestamp = new Date(rawDate).getTime();
      const dateKey = istDateKey(rawDate);
      const d = new Date(rawDate);

      const timeLabel = d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata',
      });

      let dateLabel = dateKey;
      if (dateKey === todayStr) {
        dateLabel = tx('Today', 'आज');
      } else if (dateKey === yestStr) {
        dateLabel = tx('Yesterday', 'काल');
      } else {
        dateLabel = d.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          timeZone: 'Asia/Kolkata',
        });
      }

      const count = cluster.length;
      const orderNumbers = cluster.map((e) => e.order_number);
      const sample = orderNumbers.slice(0, 3).map((n) => `#${n}`).join(', ') + (count > 3 ? '…' : '');

      return {
        id: `bundle_${dateKey}_${idx}`,
        dateKey,
        timeLabel,
        dateLabel,
        displayName: `${dateLabel}, ${timeLabel} • ${count} ${count === 1 ? 'order' : 'orders'} (${sample})`,
        orderIds: cluster.map((e) => e.id),
        orderNumbers,
        count,
        timestamp,
      };
    });
  }, [entries, isMr]);

  const entryBundleMap = useMemo(() => {
    const map = new Map<string, PrintBundle>();
    for (const b of bundles) {
      for (const id of b.orderIds) {
        map.set(id, b);
      }
    }
    return map;
  }, [bundles]);

  // Bundles filtered according to current date filter if active
  const filteredBundles = useMemo(() => {
    if (!filterDate) return bundles;
    return bundles.filter((b) => b.dateKey === filterDate);
  }, [bundles, filterDate]);

  function handleSelectBundle(bundleId: string) {
    setSelectedBundleId(bundleId);
    if (!bundleId) return;

    // Special: if "all_date", select all orders for this date
    if (bundleId.startsWith('all_date_')) {
      const targetDate = bundleId.replace('all_date_', '');
      const dateEntries = entries.filter((e) => {
        const rawDate = e.printed_at || e.created_at;
        return istDateKey(rawDate) === targetDate;
      });
      setSelectedIds(dateEntries.map((e) => e.id));
      beep(880, 80);
      setFeedback({
        kind: 'success',
        order: `${dateEntries.length} orders`,
        note: tx(
          `All ${dateEntries.length} orders on ${targetDate} auto-selected ✓ Ready to Bulk Print or Update Date`,
          `${targetDate} वरील सर्व ${dateEntries.length} ऑर्डर्स निवडल्या ✓ आता पुन्हा प्रिंट करा किंवा पिकअप तारीख बदला`
        ),
      });
      return;
    }

    const bundle = bundles.find((b) => b.id === bundleId);
    if (bundle) {
      // Auto-select all orders in this bundle according to user request!
      setSelectedIds(bundle.orderIds);
      if (!filterDate) setFilterDate(bundle.dateKey);
      beep(880, 80);
      setFeedback({
        kind: 'success',
        order: `${bundle.count} orders`,
        at: new Date(bundle.timestamp).toISOString(),
        note: tx(
          `Bundle auto-selected: ${bundle.count} orders (${bundle.dateLabel}, ${bundle.timeLabel}) ✓ Ready to Bulk Print or Update Date`,
          `बंडल निवडले: ${bundle.count} ऑर्डर्स (${bundle.dateLabel}, ${bundle.timeLabel}) ✓ आता पुन्हा प्रिंट करा किंवा पिकअप तारीख बदला`
        ),
      });
    }
  }

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

      // Bundle filter
      if (selectedBundleId && !selectedBundleId.startsWith('all_date_')) {
        const bundle = bundles.find((b) => b.id === selectedBundleId);
        if (bundle && !bundle.orderIds.includes(e.id)) return false;
      }

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
  }, [entries, statusTab, filterCourier, filterDate, search, selectedBundleId, bundles]);

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
        'Shipping Cost (₹)',
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
        e.shipping_cost ? `₹${e.shipping_cost}` : '',
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

  // ─── Fullscreen Reprint View ──────────────────────────────────────────────
  if (reprintModalOpen && reprintOrders.length > 0) {
    return (
      <ShippingPrintPreview
        orders={reprintOrders}
        backLabel={tx('← Back to Shipping Master', '← शिपिंग मास्टरवर परत जा')}
        onBack={() => setReprintModalOpen(false)}
        onClear={() => {
          setReprintModalOpen(false);
          setSelectedIds([]);
        }}
      />
    );
  }

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
        <div className="flex flex-col sm:items-end gap-3">
          <Link
            href="/courier"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-ivory text-xs font-semibold border border-white/20 transition-colors shadow-2xs self-start sm:self-auto"
          >
            <Truck className="w-3.5 h-3.5 text-gold" />
            <span>{tx('Open Courier Partner Portal (/courier)', 'डिलिव्हरी पार्टनर पोर्टल उघडा (/courier)')}</span>
            <ExternalLink className="w-3 h-3 text-gold" />
          </Link>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-2.5">
            <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-2.5 text-center border border-white/10 min-w-[85px]">
              <div className="text-lg font-bold text-amber-300 leading-none">{counts.pending}</div>
              <div className="text-[10px] uppercase tracking-wider text-ivory/70 mt-1">
                {tx('Pending', 'पिकअप बाकी')}
              </div>
              {counts.delayed > 0 && (
                <span className="inline-block mt-0.5 text-[8px] px-1 py-0.2 rounded bg-red-500/30 text-red-200 border border-red-400/40 font-semibold">
                  {counts.delayed} !
                </span>
              )}
            </div>

            <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-2.5 text-center border border-white/10 min-w-[85px]">
              <div className="text-lg font-bold text-sky-300 leading-none">{counts.pickedUp}</div>
              <div className="text-[10px] uppercase tracking-wider text-ivory/70 mt-1">
                {tx('Picked Up', 'पिकअप झाले')}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-2.5 text-center border border-white/10 min-w-[85px]">
              <div className="text-lg font-bold text-emerald-400 leading-none">{counts.dispatched}</div>
              <div className="text-[10px] uppercase tracking-wider text-ivory/70 mt-1">
                {tx('Dispatched', 'डिस्पॅच पूर्ण')}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-2.5 text-center border border-white/10 min-w-[85px]">
              <div className="text-lg font-bold text-gold leading-none font-mono">
                ₹{counts.totalShippingCost.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-ivory/70 mt-1 font-semibold">
                {tx('Total Cost', 'एकूण खर्च')}
              </div>
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

        {/* Pickup Date Control (Defaults to ongoing today date, supports back-dating) */}
        <div className="bg-ivory/60 border border-border-warm rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gold" />
              <span className="text-xs font-bold text-charcoal">
                {tx('Pickup Date', 'पिकअप तारीख')}:
              </span>
              <span className="text-[11px] text-charcoal-light">
                {tx('(Current date selected by default)', '(चालू तारीख आपोआप निवडलेली आहे)')}
              </span>
            </div>

            {isBackDated ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                <span>{tx(`Back-dating to: ${pickupDate}`, `मागील तारीख: ${pickupDate}`)}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>{tx('Today (Ongoing Date)', 'चालू तारीख')}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setPickupDate(getTodayDateStr())}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                !isBackDated
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white border border-border-warm text-charcoal hover:bg-ivory'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{tx('Today (चालू तारीख)', 'आजची तारीख (चालू)')}</span>
            </button>

            <button
              type="button"
              onClick={() => setPickupDate(getYesterdayDateStr())}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                pickupDate === getYesterdayDateStr()
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white border border-border-warm text-charcoal hover:bg-ivory'
              }`}
            >
              <span>{tx('Yesterday (काल)', 'काल')}</span>
            </button>

            <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
              <span className="text-[11px] font-semibold text-charcoal-light">{tx('Select Date:', 'तारीख निवडा:')}</span>
              <input
                type="date"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value || getTodayDateStr())}
                max={getTodayDateStr()}
                className="px-2.5 py-1 text-xs rounded-xl border border-border-warm bg-white font-mono text-charcoal focus:outline-none focus:border-gold"
              />
              {isBackDated && (
                <button
                  type="button"
                  onClick={() => setPickupDate(getTodayDateStr())}
                  className="text-[11px] text-amber-700 hover:text-amber-900 underline font-semibold ml-1"
                >
                  {tx('Reset to Today', 'आजवर रिसेट करा')}
                </button>
              )}
            </div>
          </div>
        </div>

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

        {/* Batch Multi-Scan & Bulk Date Update Drawer */}
        <div className="pt-2 border-t border-border-warm">
          <button
            type="button"
            onClick={() => setIsBatchScanOpen(!isBatchScanOpen)}
            className="inline-flex items-center gap-2 text-xs font-bold text-gold hover:text-gold/80 transition-colors"
          >
            <Layers className="w-4 h-4" />
            <span>
              {isBatchScanOpen
                ? tx('▲ Hide Batch / Bulk Scanner', '▲ बल्क स्कॅनर लपवा')
                : tx('⚡ Bulk Scan / Multi-Order Date Update (Continuous Barcodes)', '⚡ बल्क स्कॅन / एकाच वेळी अनेक ऑर्डर्सची तारीख बदला')}
            </span>
          </button>

          {isBatchScanOpen && (
            <div className="mt-3 p-4 rounded-2xl bg-ivory/60 border border-border-warm space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-semibold text-charcoal">
                  {tx(
                    'Scan multiple barcodes continuously or paste order numbers:',
                    'सतत बारकोड स्कॅन करा किंवा ऑर्डर्स क्रमांक पेस्ट करा:'
                  )}
                </span>
                <span className="text-[11px] text-charcoal-light">
                  {tx('Target Pickup Date', 'पिकअप तारीख')}:{' '}
                  <strong className="text-gold font-mono font-bold">{pickupDate}</strong>
                </span>
              </div>

              <textarea
                rows={3}
                value={batchOrdersText}
                onChange={(e) => setBatchOrdersText(e.target.value)}
                placeholder={tx(
                  'Scan barcodes or paste numbers separated by newlines, commas, or spaces (e.g. 14526, 14530, 14531)...',
                  'बारकोड स्कॅन करा किंवा ऑर्डर्स क्रमांक टाका (उदा. 14526, 14530, 14531)...'
                )}
                className="w-full border border-border-warm rounded-xl p-3 text-xs font-mono bg-white focus:outline-none focus:border-gold"
              />

              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-[11px] text-charcoal-light font-mono font-semibold">
                  {batchOrdersText.split(/[\n,\s]+/).filter(Boolean).length}{' '}
                  {tx('order(s) entered', 'ऑर्डर्स आढळल्या')}
                </span>

                <button
                  type="button"
                  onClick={handleBatchOrdersSubmit}
                  disabled={submittingBatch || !batchOrdersText.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-charcoal text-white text-xs font-bold hover:bg-charcoal/90 disabled:opacity-40 transition-all shadow-xs"
                >
                  {submittingBatch ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <PackageCheck className="w-3.5 h-3.5 text-gold" />
                  )}
                  <span>
                    {tx(
                      `Bulk Update Pickup Dates to ${pickupDate}`,
                      `या सर्व ऑर्डर्सची तारीख ${pickupDate} वर सेट करा`
                    )}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
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
                onChange={(e) => {
                  setFilterDate(e.target.value);
                  setSelectedBundleId('');
                }}
                aria-label={tx('Filter by date', 'तारखेनुसार फिल्टर')}
                className="pl-9 pr-3 py-2 text-xs sm:text-sm border border-border-warm rounded-xl focus:outline-none focus:border-gold"
              />
            </div>
            {filterDate && (
              <button
                onClick={() => {
                  setFilterDate('');
                  setSelectedBundleId('');
                }}
                className="text-xs text-gold font-semibold hover:underline"
              >
                {tx('Clear date', 'तारीख काढा')}
              </button>
            )}

            {/* Print Bundle / Batch Filter */}
            <div className="relative">
              <Layers className="w-4 h-4 text-amber-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedBundleId}
                onChange={(e) => handleSelectBundle(e.target.value)}
                title={tx('Select a print batch/bundle to filter & auto-select orders', 'प्रिंट बॅच/बंडल फिल्टर करून ऑर्डर्स आपोआप निवडण्यासाठी निवडा')}
                className={`pl-9 pr-3 py-2 text-xs sm:text-sm border rounded-xl bg-white font-medium focus:outline-none focus:border-gold max-w-[280px] truncate ${
                  selectedBundleId
                    ? 'border-amber-400 bg-amber-50/50 text-amber-900 font-semibold shadow-2xs'
                    : 'border-border-warm text-charcoal'
                }`}
              >
                <option value="">{tx('📦 All Batches / Bundles', '📦 सर्व बॅचेस / बंडल')}</option>
                {filterDate && (
                  <option value={`all_date_${filterDate}`}>
                    ⚡ {tx(`Auto-select all on ${filterDate}`, `${filterDate} वरील सर्व ऑर्डर्स निवडा`)}
                  </option>
                )}
                {filteredBundles.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.displayName}
                  </option>
                ))}
              </select>
            </div>
            {selectedBundleId && (
              <button
                type="button"
                onClick={() => setSelectedBundleId('')}
                className="text-xs text-amber-700 font-semibold hover:underline"
              >
                {tx('Clear bundle', 'बंडल काढा')}
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

        {/* Bulk Action Bar (when orders selected) */}
        {selectedIds.length > 0 && (
          <div className="bg-charcoal text-white px-4 py-3 border-b border-charcoal flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gold text-charcoal font-bold text-xs">
                {selectedIds.length}
              </span>
              <span className="text-xs sm:text-sm font-semibold">
                {tx(
                  `${selectedIds.length} orders selected`,
                  `${selectedIds.length} ऑर्डर्स निवडल्या`
                )}
              </span>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="text-xs text-ivory/70 hover:text-white underline ml-2"
              >
                {tx('Deselect All', 'सर्व निवडी काढा')}
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                disabled={bulkBusy}
                onClick={() => {
                  setBulkTargetDate(pickupDate || getTodayDateStr());
                  setBulkDateModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gold text-charcoal text-xs font-bold hover:bg-gold-light transition-colors disabled:opacity-50"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{tx('Bulk Update Pickup Date', 'पिकअप तारीख एकत्र बदला')}</span>
              </button>

              <button
                type="button"
                disabled={bulkBusy}
                onClick={handleBulkPrintAgain}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gold hover:bg-gold-light text-charcoal text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                title={tx('Reprint A4 shipping address labels with QR for selected orders', 'निवडलेल्या ऑर्डर्सचे पत्ते आणि QR कोड पुन्हा प्रिंट करा')}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{tx('Bulk Print again', 'पुन्हा एकत्र प्रिंट करा')}</span>
              </button>

              <button
                type="button"
                disabled={bulkBusy}
                onClick={handleBulkDelete}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                title={tx('Permanently delete selected orders from shipping master', 'निवडलेल्या ऑर्डर्स कायमच्या हटवा')}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{tx('Delete Selected Entries', 'नोंदी कायमच्या हटवा')}</span>
              </button>
            </div>
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
                  <th className="w-10 px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      aria-label={tx('Select all visible orders', 'सर्व ऑर्डर्स निवडा')}
                      checked={visible.length > 0 && visible.every((e) => selectedIds.includes(e.id))}
                      onChange={() => handleToggleSelectAll(visible)}
                      className="rounded border-border-warm text-gold focus:ring-gold cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3 font-semibold">{tx('Order No', 'ऑर्डर नं.')}</th>
                  <th className="px-4 py-3 font-semibold">{tx('Customer & Address', 'ग्राहक आणि पत्ता')}</th>
                  <th className="px-4 py-3 font-semibold">{tx('Status & Timing', 'स्थिती आणि वेळ')}</th>
                  <th className="px-4 py-3 font-semibold">{tx('Courier & Docket', 'कुरिअर आणि डॉकेट')}</th>
                  <th className="px-4 py-3 font-semibold">{tx('Cost (₹)', 'खर्च (₹)')}</th>
                  <th className="px-4 py-3 font-semibold">{tx('WhatsApp Tracking', 'व्हॉट्सॲप ट्रॅकिंग')}</th>
                  <th className="px-3 py-3 text-right">{tx('Actions', 'कृती')}</th>
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
                        selectedIds.includes(e.id)
                          ? 'bg-gold/10'
                          : highlightId === e.id
                          ? 'bg-gold/20'
                          : isDelayed
                          ? 'bg-red-50/40 hover:bg-red-50/70'
                          : 'hover:bg-ivory/50'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="w-10 px-3 py-3 align-top text-center">
                        <input
                          type="checkbox"
                          aria-label={`Select order ${e.order_number}`}
                          checked={selectedIds.includes(e.id)}
                          onChange={() => handleToggleSelectOne(e.id)}
                          className="rounded border-border-warm text-gold focus:ring-gold cursor-pointer mt-1"
                        />
                      </td>

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
                        {/* Bundle Badge */}
                        {(() => {
                          const b = entryBundleMap.get(e.id);
                          if (!b || b.count <= 1) return null;
                          const isSelected = selectedBundleId === b.id;
                          return (
                            <div className="mt-1.5">
                              <button
                                type="button"
                                onClick={() => handleSelectBundle(b.id)}
                                className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-semibold transition-all border shadow-2xs cursor-pointer ${
                                  isSelected
                                    ? 'bg-amber-600 text-white border-amber-700'
                                    : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                                }`}
                                title={tx(
                                  `Click to filter & auto-select this batch of ${b.count} orders (${b.timeLabel})`,
                                  `या बॅचमधील सर्व ${b.count} ऑर्डर्स निवडण्यासाठी क्लिक करा (${b.timeLabel})`
                                )}
                              >
                                <Layers className="w-2.5 h-2.5" />
                                <span>{tx(`Batch (${b.count} pcs)`, `बॅच (${b.count} ऑर्डर्स)`)}</span>
                              </button>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Customer Details & Address */}
                      <td className="px-4 py-3 align-top max-w-[240px]">
                        <div className="font-semibold text-charcoal truncate">
                          {e.customer_name || '—'}
                        </div>
                        {e.customer_mobile && (
                          <div className="text-xs font-mono text-charcoal-light mt-0.5">
                            {e.customer_mobile}
                          </div>
                        )}
                        {e.customer_address ? (
                          <div className="mt-1.5 p-2 rounded-xl bg-ivory/80 border border-border-warm/70 text-[11px] space-y-1">
                            <div className="text-charcoal leading-snug line-clamp-3">
                              {e.customer_address}
                            </div>
                            {(e.customer_city || e.customer_pincode) && (
                              <div className="text-[10px] text-charcoal-light font-medium">
                                {[e.customer_city, e.customer_pincode].filter(Boolean).join(' - ')}
                              </div>
                            )}
                            <div className="pt-0.5 flex items-center justify-end">
                              <button
                                type="button"
                                onClick={() => handleClearAddressSingle(e)}
                                className="inline-flex items-center gap-1 text-[10px] text-red-600 hover:text-red-700 hover:underline font-semibold"
                                title={tx('Delete / Clear this address', 'हा पत्ता काढून टाका')}
                              >
                                <Eraser className="w-3 h-3" />
                                <span>{tx('Delete Address', 'पत्ता हटवा')}</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          (e.customer_city || e.customer_pincode) ? (
                            <div className="text-[11px] text-charcoal-light truncate mt-0.5">
                              {[e.customer_city, e.customer_pincode].filter(Boolean).join(' - ')}
                            </div>
                          ) : (
                            <div className="text-[11px] text-charcoal-light/60 italic mt-0.5">
                              {tx('No address on record', 'पत्ता उपलब्ध नाही')}
                            </div>
                          )
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

                      {/* Shipping Cost */}
                      <td className="px-4 py-3 align-top whitespace-nowrap">
                        {e.shipping_cost ? (
                          <div className="font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl inline-block text-xs">
                            ₹{e.shipping_cost}
                          </div>
                        ) : (
                          <span className="text-xs text-charcoal-light/50 italic">—</span>
                        )}
                      </td>

                      {/* 1-Click WhatsApp Button */}
                      <td className="px-4 py-3 align-top min-w-[175px]">
                        {!e.customer_mobile ? (
                          <span className="text-[11px] text-charcoal-light/70 italic">
                            {tx('No mobile on label', 'मोबाईल नंबर नाही')}
                          </span>
                        ) : !e.courier_partner ? (
                          <button
                            type="button"
                            onClick={() => openEditModal(e)}
                            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-ivory-dark/60 text-charcoal-light border border-dashed border-border-warm hover:border-gold hover:text-gold hover:bg-gold/5 transition-colors"
                            title={tx('Assign courier partner first to enable Send Tracking', 'ट्रॅकिंग पाठवण्यासाठी आधी कुरिअर निवडा')}
                          >
                            <Truck className="w-3.5 h-3.5 text-charcoal-light/60" />
                            <span>{tx('Assign Courier First', 'आधी कुरिअर जोडा')}</span>
                          </button>
                        ) : (
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
                        )}
                      </td>

                      {/* Actions: Print, Edit & Delete */}
                      <td className="px-3 py-3 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handlePrintSingle(e)}
                            className="p-1.5 text-charcoal-light hover:text-gold hover:bg-gold/10 rounded-lg transition-colors cursor-pointer"
                            title={tx('Print label again with QR', 'लेबल पुन्हा प्रिंट करा')}
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(e)}
                            className="p-1.5 text-charcoal-light hover:text-gold hover:bg-gold/10 rounded-lg transition-colors"
                            title={tx('Edit order details', 'ऑर्डर माहिती बदला')}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(e)}
                            className="p-1.5 text-charcoal-light hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title={tx('Permanently delete entry', 'नोंद कायमची हटवा')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
              {/* Customer & Address Details */}
              <div className="p-3.5 rounded-2xl bg-ivory/60 border border-border-warm space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-charcoal uppercase tracking-wider">
                    {tx('Customer Information & Address', 'ग्राहक माहिती आणि पत्ता')}
                  </div>
                  {editCustomerAddress && (
                    <button
                      type="button"
                      onClick={() => setEditCustomerAddress('')}
                      className="inline-flex items-center gap-1 text-[11px] text-red-600 hover:text-red-700 underline font-semibold"
                      title={tx('Remove delivery address', 'पत्ता काढून टाका')}
                    >
                      <Eraser className="w-3 h-3" />
                      <span>{tx('Clear Address (पत्ता हटवा)', 'पत्ता हटवा')}</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-charcoal-light mb-1">
                      {tx('Customer Name', 'ग्राहकाचे नाव')}
                    </label>
                    <input
                      type="text"
                      value={editCustomerName}
                      onChange={(e) => setEditCustomerName(e.target.value)}
                      placeholder="e.g. Shailaja Bhosale"
                      className="w-full border border-border-warm rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-gold text-charcoal"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-charcoal-light mb-1">
                      {tx('Mobile Number', 'मोबाईल नंबर')}
                    </label>
                    <input
                      type="tel"
                      value={editCustomerMobile}
                      onChange={(e) => setEditCustomerMobile(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full border border-border-warm rounded-xl px-3 py-1.5 text-xs bg-white font-mono focus:outline-none focus:border-gold text-charcoal"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-charcoal-light mb-1">
                    {tx('Delivery Address', 'डिलिव्हरी पत्ता')}
                  </label>
                  <textarea
                    rows={2}
                    value={editCustomerAddress}
                    onChange={(e) => setEditCustomerAddress(e.target.value)}
                    placeholder={tx('Full delivery address with landmark and city', 'संपूर्ण पत्ता, लँडमार्क व शहर')}
                    className="w-full border border-border-warm rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-gold text-charcoal resize-none"
                  />
                </div>
              </div>

              {/* Pickup Status & Date Control */}
              <div className="p-3.5 rounded-2xl bg-ivory/60 border border-border-warm space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-charcoal uppercase tracking-wider">
                    <Calendar className="w-3.5 h-3.5 text-gold" />
                    <span>{tx('Pickup Status & Date', 'पिकअप स्थिती व तारीख')}</span>
                  </div>
                  <span className="text-[10px] text-charcoal-light">
                    {tx('Back-date or edit pickup timestamp', 'पिकअप तारीख बदला किंवा मागील तारीख द्या')}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-charcoal-light mb-1">
                      {tx('Pipeline Status', 'ऑर्डर स्थिती')}
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as ShippingStatus)}
                      className="w-full border border-border-warm rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:border-gold font-medium text-charcoal"
                    >
                      <option value="pending">{tx('🟡 Pending Pickup', '🟡 पिकअप बाकी')}</option>
                      <option value="picked_up">{tx('🔵 Picked Up (Hub Handover)', '🔵 पिकअप झाले')}</option>
                      <option value="dispatched">{tx('🟢 Dispatched', '🟢 डिस्पॅच पूर्ण')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-charcoal-light mb-1">
                      {tx('Pickup Date & Time (Back-date)', 'पिकअप तारीख व वेळ')}
                    </label>
                    <input
                      type="datetime-local"
                      value={editShippedAt}
                      onChange={(e) => {
                        setEditShippedAt(e.target.value);
                        if (e.target.value && editStatus === 'pending') {
                          setEditStatus('picked_up');
                        }
                      }}
                      className="w-full border border-border-warm rounded-xl px-3 py-1.5 text-xs bg-white font-mono focus:outline-none focus:border-gold text-charcoal"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-charcoal-light mb-1">
                    {tx('Handed To / Delivery Person', 'डिलिव्हरी व्यक्तीचे नाव')}
                  </label>
                  <input
                    type="text"
                    value={editHandedTo}
                    onChange={(e) => setEditHandedTo(e.target.value)}
                    placeholder={tx('e.g. Maruti Boy / Mahesh', 'उदा. महेश / मारुती बॉय')}
                    className="w-full border border-border-warm rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-gold text-charcoal"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1 text-[11px] flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const pad = (n: number) => String(n).padStart(2, '0');
                      setEditShippedAt(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`);
                      if (editStatus === 'pending') setEditStatus('picked_up');
                    }}
                    className="text-xs text-gold hover:underline font-semibold"
                  >
                    {tx('Set to Now', 'चालू वेळ सेट करा')}
                  </button>
                  <span className="text-charcoal-light/40">•</span>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() - 1);
                      const pad = (n: number) => String(n).padStart(2, '0');
                      setEditShippedAt(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
                      if (editStatus === 'pending') setEditStatus('picked_up');
                    }}
                    className="text-xs text-amber-700 hover:underline font-semibold"
                  >
                    {tx('Set to Yesterday (मागील तारीख)', 'कालची तारीख')}
                  </button>
                  <span className="text-charcoal-light/40">•</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditShippedAt('');
                      setEditStatus('pending');
                    }}
                    className="text-xs text-charcoal-light hover:underline"
                  >
                    {tx('Clear Pickup Date', 'तारीख रद्द करा')}
                  </button>
                </div>
              </div>

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

              {/* Shipping Cost (₹) Charged */}
              <div>
                <label htmlFor="edit-cost" className="block font-semibold text-charcoal mb-1.5">
                  {tx('Shipping Cost Charged (₹)', 'कुरिअर खर्च (₹)')}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-charcoal text-sm">
                    ₹
                  </span>
                  <input
                    id="edit-cost"
                    type="number"
                    value={editShippingCost}
                    onChange={(e) => setEditShippingCost(e.target.value)}
                    placeholder="e.g. 80"
                    className="w-full pl-8 pr-3.5 py-2.5 text-sm font-mono font-bold border border-border-warm rounded-xl bg-ivory/40 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 text-charcoal"
                  />
                </div>
              </div>

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

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border-warm">
              <button
                type="button"
                onClick={() => {
                  if (editingEntry) handleDelete(editingEntry);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                title={tx('Permanently delete this order from shipping master', 'ही ऑर्डर कायमची हटवा')}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{tx('Delete Entry', 'नोंद हटवा')}</span>
              </button>

              <div className="flex items-center gap-2">
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
        </div>
      )}

      {/* Bulk Update Pickup Date Modal */}
      {bulkDateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border border-border-warm shadow-xl">
            <div className="flex items-center justify-between border-b border-border-warm pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-charcoal">
                    {tx('Bulk Update Pickup Date', 'पिकअप तारीख एकत्र बदला')}
                  </h3>
                  <p className="text-xs text-charcoal-light">
                    {tx(
                      `Updating pickup timestamp for ${selectedIds.length} selected orders`,
                      `निवडलेल्या ${selectedIds.length} ऑर्डर्सची पिकअप तारीख बदलत आहे`
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBulkDateModalOpen(false)}
                className="p-1 rounded-lg text-charcoal-light hover:text-charcoal hover:bg-ivory"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs">
                {tx(
                  'This will update the pickup date/time for all selected orders and mark them as Picked Up in the shipping log.',
                  'यामुळे सर्व निवडलेल्या ऑर्डर्सची पिकअप तारीख बदलेल आणि त्या पिकअप झालेल्या नोंदी म्हणून अपडेट होतील.'
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal mb-1.5">
                  {tx('Select Target Pickup Date', 'पिकअप तारीख निवडा')}
                </label>
                <input
                  type="date"
                  value={bulkTargetDate}
                  onChange={(e) => setBulkTargetDate(e.target.value)}
                  className="w-full border border-border-warm rounded-xl px-3.5 py-2.5 bg-ivory/40 focus:outline-none focus:border-gold font-mono font-medium text-charcoal"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => setBulkTargetDate(getTodayDateStr())}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                    bulkTargetDate === getTodayDateStr()
                      ? 'bg-charcoal text-white border-charcoal'
                      : 'border-border-warm bg-white text-charcoal hover:bg-ivory'
                  }`}
                >
                  {tx('Today (आज)', 'आज')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 1);
                    const pad = (n: number) => String(n).padStart(2, '0');
                    setBulkTargetDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium border border-border-warm bg-white text-charcoal hover:bg-ivory transition-colors"
                >
                  {tx('Yesterday (काल)', 'काल')}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-warm">
              <button
                type="button"
                onClick={() => setBulkDateModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-charcoal-light hover:bg-ivory"
              >
                {tx('Cancel', 'रद्द करा')}
              </button>
              <button
                type="button"
                disabled={bulkBusy || !bulkTargetDate}
                onClick={() => handleBulkUpdateDates(bulkTargetDate)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-charcoal text-white text-xs font-semibold hover:bg-charcoal/90 disabled:opacity-40 shadow-xs"
              >
                {bulkBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>
                  {tx(
                    `Update ${selectedIds.length} Orders`,
                    `${selectedIds.length} ऑर्डर्स अपडेट करा`
                  )}
                </span>
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
