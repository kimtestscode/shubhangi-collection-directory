'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Printer,
  FileText,
  Download,
  Upload,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  Layers,
  Sparkles,
  Scissors,
  Truck,
  Eye,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { useLanguage } from '@/lib/languageContext';
import { ShippingEntry } from '@/lib/shipping';

export default function PrintCenterPage() {
  const { lang } = useLanguage();
  const isMr = lang === 'mr';
  const tx = (en: string, mr: string) => (isMr ? mr : en);

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'labels' | 'manifests' | 'cropper' | 'multi_manifest_cleaner'>('labels');

  // Shipping orders state
  const [entries, setEntries] = useState<ShippingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(''); // Default to all statuses so new orders always show!

  // Live Shiprocket Pickups state
  const [livePickups, setLivePickups] = useState<Array<{
    pickup_id: string;
    courier: string;
    shipment_count: number;
    pickup_date?: string;
    status: string;
    order_ids: number[];
    shipment_ids: number[];
    orders: Array<{
      order_number: string;
      customer_name: string;
      customer_city?: string;
      customer_pincode?: string;
      awb: string;
      status: string;
      shipping_charges?: string;
    }>;
  }>>([]);
  const [loadingLivePickups, setLoadingLivePickups] = useState(false);
  const [combiningLive, setCombiningLive] = useState(false);
  const [syncingLive, setSyncingLive] = useState(false);
  const [downloadingGroupId, setDownloadingGroupId] = useState<string | null>(null);

  // Selected orders for labels or manifest
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Processing & Download states
  const [generating, setGenerating] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  // Manual cropper states
  const [uploadLayout, setUploadLayout] = useState<'8_on_1' | '4_on_1' | '2_on_1'>('8_on_1');
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Manifest combine upload state
  const [manifestFiles, setManifestFiles] = useState<File[]>([]);
  const [combiningManifests, setCombiningManifests] = useState(false);

  // Single Multi-page Manifest Cleaner state (e.g. raw_15_Manifest.pdf)
  const [singleManifestFile, setSingleManifestFile] = useState<File | null>(null);
  const [cleaningSingleManifest, setCleaningSingleManifest] = useState(false);

  // Helper to trigger download of base64 PDF
  const downloadBase64Pdf = (base64: string, filename: string) => {
    const byteChars = atob(base64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);

    setPdfPreviewUrl(blobUrl);
    setPreviewModalOpen(true);

    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Fetch entries
  const fetchEntries = async () => {
    setLoading(true);
    try {
      const q = encodeURIComponent(search);
      const s = encodeURIComponent(statusFilter);
      const res = await fetch(`/api/shipping/print-center?q=${q}&status=${s}`);
      if (res.ok) {
        const json = await res.json();
        setEntries(json.entries || []);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch live pickups directly from Shiprocket API
  const fetchLivePickups = async () => {
    setLoadingLivePickups(true);
    try {
      const res = await fetch('/api/shipping/print-center?action=get_live_pickups');
      if (res.ok) {
        const json = await res.json();
        setLivePickups(json.live_pickups || []);
      }
    } catch (e) {
      console.error('Failed to load live Shiprocket pickups:', e);
    } finally {
      setLoadingLivePickups(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [statusFilter]);

  // When switching to manifests tab, automatically load live Shiprocket pickups
  useEffect(() => {
    if (activeTab === 'manifests') {
      fetchLivePickups();
    }
  }, [activeTab]);

  // Download manifest for a single courier pickup group
  const handleDownloadGroupManifest = async (group: any) => {
    setDownloadingGroupId(group.pickup_id);
    try {
      const res = await fetch('/api/shipping/print-center', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_manifest',
          order_ids: group.order_ids,
          shipment_ids: group.shipment_ids,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.pdf_base64) {
        throw new Error(json.error || 'Failed to generate manifest PDF');
      }

      downloadBase64Pdf(
        json.pdf_base64,
        `Manifest_${group.courier.replace(/[^a-zA-Z0-9]/g, '_')}_${group.pickup_id}.pdf`
      );
    } catch (err: any) {
      alert(err.message || 'Error downloading manifest');
    } finally {
      setDownloadingGroupId(null);
    }
  };

  // Combine ALL live courier manifests into 1 Zero-Waste A4 PDF
  const handleCombineAllLive = async () => {
    setCombiningLive(true);
    try {
      const res = await fetch('/api/shipping/print-center', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'combine_all_live_manifests',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.pdf_base64) {
        throw new Error(json.error || 'Failed to combine live manifests');
      }

      downloadBase64Pdf(
        json.pdf_base64,
        `Combined_All_Courier_Manifests_A4_${new Date().toISOString().slice(0, 10)}.pdf`
      );
    } catch (err: any) {
      alert(err.message || 'Error combining manifests');
    } finally {
      setCombiningLive(false);
    }
  };

  // Sync live Shiprocket AWBs back to Shipping Master database
  const handleSyncLiveOrders = async () => {
    setSyncingLive(true);
    try {
      const res = await fetch('/api/shipping/print-center', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_live_shiprocket_orders',
        }),
      });
      const json = await res.json();
      if (res.ok) {
        alert(
          tx(
            `Synced ${json.updated_count || 0} orders with live AWBs and courier info!`,
            `${json.updated_count || 0} ऑर्डर्स सिंक झाले!`
          )
        );
        fetchEntries();
        fetchLivePickups();
      }
    } catch (e: any) {
      alert(e.message || 'Sync failed');
    } finally {
      setSyncingLive(false);
    }
  };

  // Handle enter key search
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEntries();
  };

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredEntries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEntries.map((e) => e.id)));
    }
  };

  // Filtered entries by search term
  const filteredEntries = useMemo(() => {
    if (!search.trim()) return entries;
    const s = search.toLowerCase().trim();
    return entries.filter(
      (e) =>
        e.order_number?.toLowerCase().includes(s) ||
        e.customer_name?.toLowerCase().includes(s) ||
        e.customer_mobile?.toLowerCase().includes(s) ||
        e.tracking_number?.toLowerCase().includes(s) ||
        e.notes?.toLowerCase().includes(s)
    );
  }, [entries, search]);

  // Selected orders objects
  const selectedEntries = useMemo(() => {
    return entries.filter((e) => selectedIds.has(e.id));
  }, [entries, selectedIds]);

  // Generate 8-on-1 Labels via API
  const handleGenerate8on1Labels = async () => {
    if (selectedEntries.length === 0) {
      alert(tx('Please select at least 1 order to generate labels.', 'कृपया किमान 1 ऑर्डर निवडा.'));
      return;
    }

    const shipmentIds = selectedEntries
      .map((e) => e.shiprocket_shipment_id)
      .filter(Boolean) as number[];

    if (shipmentIds.length === 0) {
      alert(
        tx(
          'None of the selected orders have Shiprocket Shipment IDs registered yet. Please upload the Shiprocket label PDF in the "Upload & Crop" tab.',
          'निवडलेल्या ऑर्डर्समध्ये शिपमेंट आयडी उपलब्ध नाही. कृपया "अपलोड आणि क्रॉप" टॅबमध्ये Shiprocket PDF अपलोड करा.'
        )
      );
      return;
    }

    setGenerating(true);
    setProgressMsg(tx('Connecting to Shiprocket API & fetching labels…', 'Shiprocket API कडून लेबल्स आणत आहे…'));

    try {
      const res = await fetch('/api/shipping/print-center', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_labels',
          shipment_ids: shipmentIds,
          layout: '8_on_1',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.pdf_base64) {
        throw new Error(json.error || 'Failed to generate labels PDF');
      }

      // Create download blob
      const byteChars = atob(json.pdf_base64);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);

      setPdfPreviewUrl(blobUrl);
      setPreviewModalOpen(true);

      // Trigger instant download
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Shubhangi_Labels_8on1_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || 'Error generating labels');
    } finally {
      setGenerating(false);
      setProgressMsg('');
    }
  };

  // Generate Manifest via API
  const handleGenerateManifest = async () => {
    if (selectedEntries.length === 0) {
      alert(tx('Please select orders for the manifest.', 'कृपया मॅनिफेस्टसाठी ऑर्डर्स निवडा.'));
      return;
    }

    let shipmentIds = selectedEntries
      .map((e) => e.shiprocket_shipment_id)
      .filter(Boolean) as number[];

    const orderNums = new Set(selectedEntries.map((e) => e.order_number));
    const matchedOrderIds: number[] = [];
    const matchedShipmentIds: number[] = [];

    for (const group of livePickups) {
      for (const ord of group.orders) {
        if (orderNums.has(ord.order_number)) {
          matchedOrderIds.push(...group.order_ids);
          matchedShipmentIds.push(...group.shipment_ids);
        }
      }
    }

    if (shipmentIds.length === 0 && matchedShipmentIds.length > 0) {
      shipmentIds = Array.from(new Set(matchedShipmentIds));
    }

    if (shipmentIds.length === 0 && matchedOrderIds.length === 0) {
      alert(
        tx(
          'Could not find live Shiprocket IDs for selected orders. Please click "Reload Live Pickups" or use the live courier buttons above!',
          'निवडलेल्या ऑर्डर्सचे शिपरोकेट आयडी सापडले नाहीत. कृपया वरील "Reload Live Pickups" बटणावर क्लिक करा!'
        )
      );
      return;
    }

    setGenerating(true);
    setProgressMsg(tx('Calling Shiprocket Manifest API & tiling pages…', 'Shiprocket Manifest API वरून मॅनिफेस्ट तयार करत आहे…'));

    try {
      const res = await fetch('/api/shipping/print-center', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_manifest',
          shipment_ids: shipmentIds,
          order_ids: Array.from(new Set(matchedOrderIds)),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.pdf_base64) {
        throw new Error(json.error || 'Failed to generate manifest PDF');
      }

      downloadBase64Pdf(
        json.pdf_base64,
        `Shubhangi_Manifest_A4_${new Date().toISOString().slice(0, 10)}.pdf`
      );
    } catch (err: any) {
      alert(err.message || 'Error generating manifest');
    } finally {
      setGenerating(false);
      setProgressMsg('');
    }
  };

  // Upload raw Shiprocket Label PDF and crop to 8-on-1 (or 4/2)
  const handleUploadRawLabels = async (file: File) => {
    setUploadingPdf(true);
    setUploadError(null);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const res = reader.result as string;
          const base64 = res.split(',')[1] || res;
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const rawBase64 = await base64Promise;

      const res = await fetch('/api/shipping/print-center', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'crop_uploaded_labels',
          raw_pdf_base64: rawBase64,
          layout: uploadLayout,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.pdf_base64) {
        throw new Error(json.error || 'Failed to crop uploaded PDF');
      }

      const byteChars = atob(json.pdf_base64);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);

      setPdfPreviewUrl(blobUrl);
      setPreviewModalOpen(true);

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Shubhangi_${uploadLayout}_Labels_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to crop PDF');
    } finally {
      setUploadingPdf(false);
    }
  };

  // Combine multiple raw Shiprocket manifest PDFs into A4 without white space
  const handleCombineUploadedManifests = async () => {
    if (manifestFiles.length === 0) return;
    setCombiningManifests(true);
    setUploadError(null);

    try {
      const base64List: string[] = [];
      for (const f of manifestFiles) {
        const reader = new FileReader();
        const p = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const res = reader.result as string;
            resolve(res.split(',')[1] || res);
          };
          reader.onerror = reject;
        });
        reader.readAsDataURL(f);
        base64List.push(await p);
      }

      const res = await fetch('/api/shipping/print-center', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'combine_uploaded_manifests',
          manifest_pdfs_base64: base64List,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.pdf_base64) {
        throw new Error(json.error || 'Failed to combine manifests');
      }

      const byteChars = atob(json.pdf_base64);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);

      setPdfPreviewUrl(blobUrl);
      setPreviewModalOpen(true);

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Shubhangi_Manifests_Combined_A4_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setManifestFiles([]);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to combine manifests');
    } finally {
      setCombiningManifests(false);
    }
  };

  // Clean and remove white space from single multi-page manifest PDF (e.g. raw_15_Manifest.pdf)
  const handleCleanSingleManifestPdf = async (fileToProcess?: File) => {
    const targetFile = fileToProcess || singleManifestFile;
    if (!targetFile) return;

    setCleaningSingleManifest(true);
    setUploadError(null);

    try {
      const reader = new FileReader();
      const p = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const res = reader.result as string;
          resolve(res.split(',')[1] || res);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(targetFile);
      const rawBase64 = await p;

      const res = await fetch('/api/shipping/print-center', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'combine_uploaded_manifests',
          raw_pdf_base64: rawBase64,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.pdf_base64) {
        throw new Error(json.error || 'Failed to refine manifest PDF');
      }

      const byteChars = atob(json.pdf_base64);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);

      setPdfPreviewUrl(blobUrl);
      setPreviewModalOpen(true);

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Refined_Manifest_Cleaned_A4_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to clean manifest white space');
    } finally {
      setCleaningSingleManifest(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-border-warm shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-gold/15 text-charcoal border border-gold/30">
                {tx('Paper-Saving Print Center', 'कागद बचत प्रिंट सेंटर')}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Sparkles className="w-3 h-3" />
                {tx('8 Labels Per A4', 'एका पानावर ८ लेबल्स')}
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal tracking-tight">
              {tx('Smart Print Center & Manifest Generator', 'स्मार्ट प्रिंट सेंटर आणि मॅनिफेस्ट जनरेटर')}
            </h1>
            <p className="text-xs sm:text-sm text-charcoal-light max-w-2xl">
              {tx(
                'Auto-fit 8 Shiprocket labels per A4 portrait page (2×4 grid) to save paper, and combine multiple courier pickup manifests into clean zero-waste sheets.',
                'कागदाची नासाडी टाळण्यासाठी एका A4 पानावर ८ लेबल्स (२×४ ग्रिड) बसवा आणि सर्व कुरिअर मॅनिफेस्ट शून्य पांढऱ्या जागेत एकत्र प्रिंट करा.'
              )}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/admin/shipping-master"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-border-warm bg-ivory/60 hover:bg-ivory text-xs font-semibold text-charcoal transition-all shadow-2xs"
            >
              <span>{tx('Open Shipping Master', 'शिपिंग मास्टर उघडा')}</span>
              <ChevronRight className="w-3.5 h-3.5 text-charcoal-light" />
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-border-warm/60">
          <button
            type="button"
            onClick={() => setActiveTab('labels')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'labels'
                ? 'bg-charcoal text-white shadow-xs'
                : 'bg-ivory/70 text-charcoal-light hover:text-charcoal hover:bg-ivory'
            }`}
          >
            <Printer className="w-4 h-4 text-gold" />
            <span>{tx('8-on-1 Labels (Auto API)', '८-इन-१ लेबल्स (API)')}</span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/20">
              {entries.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('manifests')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'manifests'
                ? 'bg-charcoal text-white shadow-xs'
                : 'bg-ivory/70 text-charcoal-light hover:text-charcoal hover:bg-ivory'
            }`}
          >
            <FileText className="w-4 h-4 text-gold" />
            <span>{tx('Pickup Manifests (Auto-Fit)', 'पिकअप मॅनिफेस्ट्स')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cropper')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'cropper'
                ? 'bg-charcoal text-white shadow-xs'
                : 'bg-ivory/70 text-charcoal-light hover:text-charcoal hover:bg-ivory'
            }`}
          >
            <Scissors className="w-4 h-4 text-gold" />
            <span>{tx('Upload & Crop PDF (Manual)', 'PDF अपलोड आणि क्रॉप')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('multi_manifest_cleaner')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'multi_manifest_cleaner'
                ? 'bg-charcoal text-white shadow-xs'
                : 'bg-gold/15 text-charcoal hover:bg-gold/25 border border-gold/30'
            }`}
          >
            <Sparkles className="w-4 h-4 text-gold-dark" />
            <span>{tx('Trim Manifest White Spaces (Single/Multi-Page)', 'मॅनिफेस्ट व्हाईट स्पेस कटर')}</span>
          </button>
        </div>
      </div>

      {/* TAB 1: 8-on-1 LABELS GENERATION */}
      {activeTab === 'labels' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white rounded-2xl p-4 border border-border-warm shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative">
              <Search className="w-4 h-4 text-charcoal-light absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tx('Search order #, customer name, mobile, AWB…', 'ऑर्डर क्र, नाव, मोबाईल किंवा ट्रॅकिंग शोधा…')}
                className="w-full pl-10 pr-4 py-2 bg-ivory/50 rounded-xl border border-border-warm text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
              />
            </form>

            <div className="flex items-center gap-2.5 flex-wrap">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-ivory/50 rounded-xl border border-border-warm text-xs font-semibold text-charcoal focus:outline-none"
              >
                <option value="picked_up">{tx('Picked Up / Dispatched', 'पिकअप झालेले')}</option>
                <option value="pending">{tx('Pending Orders', 'पेंडिंग ऑर्डर्स')}</option>
                <option value="">{tx('All Statuses', 'सर्व स्टेटस')}</option>
              </select>

              <button
                type="button"
                onClick={fetchEntries}
                disabled={loading}
                className="p-2 rounded-xl border border-border-warm bg-ivory/50 hover:bg-ivory text-charcoal"
                title={tx('Refresh', 'रिफ्रेश करा')}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-gold' : ''}`} />
              </button>

              <button
                type="button"
                onClick={handleGenerate8on1Labels}
                disabled={generating || selectedIds.size === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold text-charcoal font-bold text-xs sm:text-sm hover:bg-gold-light transition-all shadow-xs disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>
                  {generating
                    ? progressMsg || tx('Generating…', 'तयार करत आहे…')
                    : tx(`Print 8-on-1 Labels (${selectedIds.size})`, `८ लेबल्स A4 प्रिंट (${selectedIds.size})`)}
                </span>
              </button>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-3xl border border-border-warm overflow-hidden shadow-xs">
            <div className="p-4 bg-ivory/40 border-b border-border-warm flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filteredEntries.length > 0 && selectedIds.size === filteredEntries.length}
                    onChange={handleSelectAll}
                    className="rounded border-border-warm text-gold focus:ring-gold"
                  />
                  <span>
                    {selectedIds.size > 0
                      ? tx(`Selected ${selectedIds.size} of ${filteredEntries.length} orders`, `${filteredEntries.length} पैकी ${selectedIds.size} निवडले`)
                      : tx(`Select All (${filteredEntries.length} orders)`, `सर्व निवडा (${filteredEntries.length} ऑर्डर्स)`)}
                  </span>
                </label>
              </div>

              <div className="text-charcoal-light flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                <span>{tx('Ready for 8-per-page A4 printing', '८-प्रति-पान A4 प्रिंटिंगसाठी सज्ज')}</span>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-ivory/60 border-b border-border-warm text-charcoal-light uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">{tx('Order & Date', 'ऑर्डर आणि तारीख')}</th>
                    <th className="py-3 px-4">{tx('Customer', 'ग्राहक')}</th>
                    <th className="py-3 px-4">{tx('Destination', 'पत्ता / पिनकोड')}</th>
                    <th className="py-3 px-4">{tx('Shiprocket AWB / Courier', 'AWB / कुरिअर')}</th>
                    <th className="py-3 px-4">{tx('Status', 'स्थिती')}</th>
                    <th className="py-3 px-4 text-right">{tx('Actions', 'कृती')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-warm/60">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-charcoal-light">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gold" />
                        <span>{tx('Loading orders…', 'ऑर्डर्स लोड होत आहेत…')}</span>
                      </td>
                    </tr>
                  ) : filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-charcoal-light">
                        <FileText className="w-8 h-8 mx-auto mb-2 text-border-warm" />
                        <span>{tx('No matching orders found.', 'कोणतीही ऑर्डर आढळली नाही.')}</span>
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map((e) => {
                      const isSelected = selectedIds.has(e.id);
                      return (
                        <tr
                          key={e.id}
                          onClick={() => handleToggleSelect(e.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-gold/10 hover:bg-gold/15' : 'hover:bg-ivory/40'
                          }`}
                        >
                          <td className="py-3 px-4 text-center" onClick={(evt) => evt.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(e.id)}
                              className="rounded border-border-warm text-gold focus:ring-gold"
                            />
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-charcoal text-sm">#{e.order_number}</div>
                            <div className="text-[10px] text-charcoal-light">
                              {e.shipped_at
                                ? new Date(e.shipped_at).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : new Date(e.created_at).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                  })}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-charcoal truncate max-w-[160px]">
                              {e.customer_name || '—'}
                            </div>
                            <div className="text-[11px] text-charcoal-light">{e.customer_mobile || '—'}</div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="truncate max-w-[200px] text-charcoal">
                              {e.customer_address || e.customer_city || '—'}
                            </div>
                            <div className="text-[11px] font-mono text-gold-dark font-semibold">
                              {e.customer_pincode || '—'}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {e.tracking_number ? (
                              <div>
                                <div className="font-mono font-bold text-charcoal">{e.tracking_number}</div>
                                <div className="text-[10px] text-charcoal-light flex items-center gap-1">
                                  <Truck className="w-3 h-3 text-gold" />
                                  <span>{e.notes || e.courier_partner || 'Shiprocket'}</span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-charcoal-light/70 italic text-[11px]">
                                {tx('Pending AWB', 'AWB पेंडिंग')}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                e.status === 'picked_up' || e.status === 'dispatched'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {e.status}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right" onClick={(evt) => evt.stopPropagation()}>
                            {e.tracking_url && (
                              <a
                                href={e.tracking_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-gold-dark hover:underline font-semibold"
                              >
                                <span>{tx('Track', 'ट्रॅक')}</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PICKUP MANIFEST GENERATOR */}
      {activeTab === 'manifests' && (
        <div className="space-y-6">
          {/* SECTION 1: LIVE SHIPROCKET SCHEDULED PICKUPS (DIRECT SHIPROCKET API) */}
          <div className="bg-white rounded-3xl p-6 border border-border-warm shadow-xs space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="font-serif text-lg font-bold text-charcoal">
                    {tx('Live Scheduled Pickups & Courier Manifests', 'थेट शेड्युल झालेले पिकअप्स व मॅनिफेस्ट')}
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold">
                    Shiprocket Live API
                  </span>
                </div>
                <p className="text-xs text-charcoal-light mt-1">
                  {tx(
                    'Direct live pickups registered on Shiprocket. Download individual manifests per courier or combine all into 1 zero-waste A4 sheet.',
                    'कुरिअरकडे शेड्युल झालेले थेट पिकअप्स. व्हाईटस्पेस कट करून स्वतंत्र किंवा सर्व एकत्र प्रिंट करा.'
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={fetchLivePickups}
                  disabled={loadingLivePickups}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border-warm bg-ivory/60 hover:bg-ivory text-charcoal font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
                  title={tx('Reload Live Pickups from Shiprocket API', 'शिपरोकेट वरून थेट डेटा रिफ्रेश करा')}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingLivePickups ? 'animate-spin text-purple-600' : ''}`} />
                  <span>{loadingLivePickups ? tx('Fetching…', 'शोधत आहे…') : tx('Reload Live Pickups', 'लाईव्ह पिकअप्स रिफ्रेश')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSyncLiveOrders}
                  disabled={syncingLive}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
                  title={tx('Sync live AWBs and courier info to Shipping Master table', 'शिपिंग मास्टर मध्ये AWB डेटा सिंक करा')}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingLive ? 'animate-spin text-indigo-600' : ''}`} />
                  <span>{syncingLive ? tx('Syncing…', 'सिंक करत आहे…') : tx('Sync to Database', 'डेटाबेस सिंक')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCombineAllLive}
                  disabled={combiningLive || livePickups.length === 0}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs sm:text-sm transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                  title={tx('Download all active courier manifests combined into 1 A4 PDF without waste', 'सर्व कुरिअरचे मॅनिफेस्ट एकत्र करून एका A4 पानावर झिरो वेस्ट प्रिंट करा')}
                >
                  {combiningLive ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                  <span>{combiningLive ? tx('Combining…', 'जोडत आहे…') : tx('Combine All Manifests (Zero-Waste A4)', 'सर्व मॅनिफेस्ट एकत्र करा (A4)')}</span>
                </button>
              </div>
            </div>

            {/* List of Live Pickups */}
            {loadingLivePickups && livePickups.length === 0 ? (
              <div className="py-12 text-center text-charcoal-light space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-purple-600 mx-auto" />
                <p className="text-xs font-medium">{tx('Fetching live pickups from Shiprocket API…', 'थेट शिपरोकेट वरून पिकअप्स तपासत आहे…')}</p>
              </div>
            ) : livePickups.length === 0 ? (
              <div className="p-6 rounded-2xl bg-ivory/50 border border-dashed border-border-warm text-center space-y-2">
                <p className="text-xs font-semibold text-charcoal">
                  {tx('No scheduled pickups found on Shiprocket right now.', 'सध्या शिपरोकेटवर कोणतेही शेड्युल झालेले पिकअप्स सापडले नाहीत.')}
                </p>
                <p className="text-[11px] text-charcoal-light max-w-md mx-auto">
                  {tx('When you book shipments via Shipping Master, pickups are automatically requested and will appear here.', 'शिपिंग मास्टर मधून शिपमेंट बुक केल्यावर ते येथे दिसतील.')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {livePickups.map((group) => {
                  const isDownloading = downloadingGroupId === group.pickup_id;
                  return (
                    <div
                      key={`${group.pickup_id}_${group.courier}`}
                      className="p-4 rounded-2xl border border-border-warm bg-gradient-to-br from-white to-ivory/40 shadow-xs flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs text-charcoal truncate" title={group.courier}>
                            🚚 {group.courier}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold shrink-0">
                            {group.shipment_count} {group.shipment_count === 1 ? 'AWB' : 'AWBs'}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-charcoal-light">
                          {group.pickup_id}
                        </div>
                        {group.pickup_date && (
                          <div className="text-[10px] text-charcoal-light">
                            {tx('Pickup Date:', 'पिकअप तारीख:')} <strong className="text-charcoal">{group.pickup_date}</strong>
                          </div>
                        )}
                        <div className="pt-1 flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                          {group.orders.map((ord) => (
                            <span
                              key={ord.order_number}
                              className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-ivory-dark text-charcoal border border-border-warm/60"
                              title={`${ord.customer_name} (${ord.awb})`}
                            >
                              #{ord.order_number}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDownloadGroupManifest(group)}
                        disabled={isDownloading}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-charcoal hover:bg-charcoal/90 text-white font-bold text-xs transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
                      >
                        {isDownloading ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5 text-gold" />
                        )}
                        <span>{isDownloading ? tx('Downloading…', 'डाऊनलोड करत आहे…') : tx('Download Refined Manifest', 'रिफाईंड मॅनिफेस्ट डाऊनलोड')}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 2: MANUAL ORDER SELECTION & CUSTOM MANIFEST */}
          <div className="bg-white rounded-3xl p-6 border border-border-warm shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-serif text-base font-bold text-charcoal">
                  {tx('Custom Selection from Shipping Master Orders', 'शिपिंग मास्टर मधून निवडक ऑर्डर्स')}
                </h3>
                <p className="text-xs text-charcoal-light">
                  {tx(
                    'Select specific orders below if you want to generate a custom manifest directly.',
                    'विशिष्ट ऑर्डर्स निवडून थेट कस्टम मॅनिफेस्ट काढण्यासाठी खाली निवडा.'
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={fetchEntries}
                  disabled={loading}
                  className="p-2 rounded-xl border border-border-warm bg-ivory/50 hover:bg-ivory text-charcoal cursor-pointer"
                  title={tx('Reload Orders Table', 'ऑर्डर्स रिफ्रेश करा')}
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-gold' : ''}`} />
                </button>

                <button
                  type="button"
                  onClick={handleGenerateManifest}
                  disabled={generating || selectedIds.size === 0}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-charcoal text-white font-bold text-xs sm:text-sm hover:bg-charcoal/90 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-gold" />
                  <span>
                    {generating
                      ? progressMsg || tx('Generating…', 'तयार करत आहे…')
                      : tx(`Generate Selected Manifest (${selectedIds.size})`, `निवडलेला मॅनिफेस्ट तयार करा (${selectedIds.size})`)}
                  </span>
                </button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border-warm/60">
              <div className="flex-1 max-w-sm relative w-full">
                <Search className="w-4 h-4 text-charcoal-light absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={tx('Search order #, customer, AWB…', 'ऑर्डर क्र, ग्राहक किंवा ट्रॅकिंग शोधा…')}
                  className="w-full pl-9 pr-3 py-1.5 bg-ivory/40 rounded-xl border border-border-warm text-xs focus:outline-none"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-ivory/40 rounded-xl border border-border-warm text-xs font-semibold text-charcoal focus:outline-none w-full sm:w-auto"
              >
                <option value="">{tx('All Statuses (Shows Latest)', 'सर्व स्टेटस (नवीन आधी)')}</option>
                <option value="picked_up">{tx('Picked Up / Dispatched', 'पिकअप झालेले')}</option>
                <option value="pending">{tx('Pending Orders', 'पेंडिंग ऑर्डर्स')}</option>
              </select>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-3xl border border-border-warm overflow-hidden shadow-xs">
            <div className="p-4 bg-ivory/40 border-b border-border-warm flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={filteredEntries.length > 0 && selectedIds.size === filteredEntries.length}
                  onChange={handleSelectAll}
                  className="rounded border-border-warm text-gold focus:ring-gold"
                />
                <span>
                  {tx(`Selected ${selectedIds.size} of ${filteredEntries.length} parcels`, `${filteredEntries.length} पैकी ${selectedIds.size} पार्सल निवडले`)}
                </span>
              </label>
            </div>

            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-ivory/60 border-b border-border-warm text-charcoal-light uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">{tx('Order #', 'ऑर्डर क्र')}</th>
                    <th className="py-3 px-4">{tx('Customer Name', 'ग्राहकाचे नाव')}</th>
                    <th className="py-3 px-4">{tx('City / Pin', 'शहर / पिन')}</th>
                    <th className="py-3 px-4">{tx('AWB Number', 'AWB क्रमांक')}</th>
                    <th className="py-3 px-4">{tx('Courier', 'कुरिअर')}</th>
                    <th className="py-3 px-4">{tx('Status', 'स्थिती')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-warm/60">
                  {filteredEntries.map((e) => (
                    <tr
                      key={e.id}
                      onClick={() => handleToggleSelect(e.id)}
                      className={`cursor-pointer transition-colors ${
                        selectedIds.has(e.id) ? 'bg-gold/10 hover:bg-gold/15' : 'hover:bg-ivory/40'
                      }`}
                    >
                      <td className="py-3 px-4 text-center" onClick={(evt) => evt.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(e.id)}
                          onChange={() => handleToggleSelect(e.id)}
                          className="rounded border-border-warm text-gold focus:ring-gold"
                        />
                      </td>
                      <td className="py-3 px-4 font-bold text-charcoal">#{e.order_number}</td>
                      <td className="py-3 px-4">{e.customer_name || '—'}</td>
                      <td className="py-3 px-4">
                        {e.customer_city || '—'}{' '}
                        <span className="font-mono text-gold-dark font-semibold">
                          ({e.customer_pincode || '—'})
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold">{e.tracking_number || '—'}</td>
                      <td className="py-3 px-4">{e.notes || e.courier_partner || 'Shiprocket'}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            e.status === 'picked_up' || e.status === 'dispatched'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {e.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: UPLOAD & CROP (MANUAL PDF WORKFLOW) */}
      {activeTab === 'cropper' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: 8-on-1 Label PDF Cropper */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-border-warm shadow-xs space-y-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-gold/20 text-gold flex items-center justify-center">
                <Scissors className="w-5 h-5 text-charcoal" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-charcoal">
                  {tx('Crop Shiprocket Labels to 8-on-1 A4', 'Shiprocket लेबल्स एका A4 पानावर ८ क्रॉप करा')}
                </h3>
                <p className="text-xs text-charcoal-light mt-1">
                  {tx(
                    'Upload raw Shiprocket label PDF (from downloads or dashboard). It auto-cuts every label and tiles 8 labels per A4 portrait page.',
                    'Shiprocket डॅशबोर्डवरून डाऊनलोड केलेली raw PDF येथे टाका. ती आपोआप कापून एका A4 पानावर ८ लेबल्स बसवेल.'
                  )}
                </p>
              </div>

              {/* Layout options */}
              <div className="flex items-center gap-2 pt-2">
                <label className="text-xs font-semibold text-charcoal-light">
                  {tx('Output Layout:', 'मांडणी:')}
                </label>
                {(['8_on_1', '4_on_1', '2_on_1'] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setUploadLayout(l)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      uploadLayout === l
                        ? 'bg-charcoal text-white'
                        : 'bg-ivory text-charcoal-light hover:bg-ivory/80'
                    }`}
                  >
                    {l === '8_on_1' ? tx('8-on-1 (Recommended)', '८-इन-१ (सर्वोत्तम)') : l.replace('_', '-')}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-border-warm/60">
              <label className="block w-full border-2 border-dashed border-gold/40 hover:border-gold rounded-2xl p-6 text-center cursor-pointer bg-ivory/30 hover:bg-ivory/60 transition-all">
                <Upload className="w-6 h-6 mx-auto mb-2 text-gold-dark" />
                <span className="text-xs font-bold text-charcoal block">
                  {uploadingPdf
                    ? tx('Processing & Cropping…', 'क्रॉप करत आहे…')
                    : tx('Click to Upload Raw Shiprocket Labels PDF', 'Shiprocket Labels PDF येथे अपलोड करा')}
                </span>
                <span className="text-[10px] text-charcoal-light mt-0.5 block">
                  {tx('Accepts any Shiprocket landscape A4 label file', 'कोणतीही Shiprocket A4 PDF स्वीकारली जाईल')}
                </span>
                <input
                  type="file"
                  accept="application/pdf"
                  disabled={uploadingPdf}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadRawLabels(f);
                  }}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Card 2: Multi-Manifest Combiner (No White Space) */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-border-warm shadow-xs space-y-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-charcoal text-gold flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-charcoal">
                  {tx('Combine Multiple Manifests (Zero Waste)', 'अनेक मॅनिफेस्ट एकत्र करा (कागद बचत)')}
                </h3>
                <p className="text-xs text-charcoal-light mt-1">
                  {tx(
                    'Upload 2, 3 or more raw manifest PDFs (e.g. MANIFEST-0013, 0014, 0015). We trim large blank footers and combine them onto standard A4 pages.',
                    'सर्व कुरिअरचे वेगवेगळे raw मॅनिफेस्ट PDFs येथे जोडा. खालील पांढरी मोकळी जागा काढून ते एकाच पानात बसवले जातील.'
                  )}
                </p>
              </div>

              {manifestFiles.length > 0 && (
                <div className="space-y-1.5 p-3 rounded-xl bg-ivory/60 border border-border-warm text-xs">
                  <div className="font-semibold text-charcoal">
                    {tx(`Selected ${manifestFiles.length} files:`, `${manifestFiles.length} फाइल्स निवडल्या:`)}
                  </div>
                  {manifestFiles.map((f, i) => (
                    <div key={i} className="text-[11px] text-charcoal-light truncate flex items-center gap-1.5">
                      <FileText className="w-3 h-3 text-gold" />
                      <span>{f.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 pt-4 border-t border-border-warm/60">
              <label className="block w-full border-2 border-dashed border-charcoal/20 hover:border-charcoal rounded-2xl p-4 text-center cursor-pointer bg-ivory/30 hover:bg-ivory/60 transition-all">
                <FileText className="w-5 h-5 mx-auto mb-1 text-charcoal-light" />
                <span className="text-xs font-bold text-charcoal block">
                  {tx('Select Multiple Manifest PDFs', 'अनेक मॅनिफेस्ट PDFs निवडा')}
                </span>
                <input
                  type="file"
                  accept="application/pdf"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) setManifestFiles(files);
                  }}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={handleCombineUploadedManifests}
                disabled={combiningManifests || manifestFiles.length === 0}
                className="w-full py-2.5 rounded-xl bg-charcoal text-white font-bold text-xs sm:text-sm hover:bg-charcoal/90 transition-all shadow-xs disabled:opacity-50"
              >
                {combiningManifests
                  ? tx('Combining Manifests…', 'एकत्र करत आहे…')
                  : tx(`Combine ${manifestFiles.length} Manifests to A4`, `${manifestFiles.length} मॅनिफेस्ट A4 पानात एकत्र करा`)}
              </button>
            </div>
          </div>

          {/* Card 3: Downloaded Multi-Manifest Single PDF Cleaner (e.g. raw_15_Manifest.pdf) */}
          <div className="md:col-span-2 bg-gradient-to-r from-amber-50/70 via-white to-amber-50/40 rounded-3xl p-6 sm:p-8 border border-amber-300 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gold text-charcoal">
                    {tx('Auto White Space Remover', 'पांढरी जागा कापणारे टूल')}
                  </span>
                  <span className="text-xs font-semibold text-charcoal-light">
                    {tx('For downloads like raw_15_Manifest.pdf', 'उदा. raw_15_Manifest.pdf सारख्या फाइल्स')}
                  </span>
                </div>
                <h3 className="font-serif text-lg font-bold text-charcoal">
                  {tx('Downloaded All Manifests in a Single PDF? Cut White Space Instantly', 'Shiprocket वरून डाऊनलोड केलेल्या सिंगल एकत्रित PDF मधील पांढरी जागा काढा')}
                </h3>
                <p className="text-xs text-charcoal-light max-w-3xl">
                  {tx(
                    'When selecting multiple manifests on Shiprocket, it downloads 1 combined PDF where each manifest has lots of blank space at the bottom. Upload that single PDF here to automatically strip bottom white spaces and compress all manifests into fewer, compact A4 pages without wasting paper.',
                    'Shiprocket वरून एकाच वेळी अनेक मॅनिफेस्ट निवडल्यास एकच PDF डाऊनलोड होते ज्याच्या प्रत्येक पानावर खाली खूप पांढरी जागा असते. ती फाईल येथे अपलोड केल्यास पांढरी जागा कापून सर्व मॅनिफेस्ट कमीत कमी A4 पानांमध्ये कॉम्पॅक्ट करून मिळतील.'
                  )}
                </p>
              </div>
            </div>

            <label className="block w-full border-2 border-dashed border-gold hover:border-gold-dark rounded-2xl p-6 text-center cursor-pointer bg-white hover:bg-gold/5 transition-all">
              <Sparkles className="w-6 h-6 mx-auto mb-2 text-gold-dark" />
              <span className="text-xs font-bold text-charcoal block">
                {cleaningSingleManifest
                  ? tx('Removing White Spaces & Re-packing A4 Pages…', 'पांढरी जागा काढून पाने कॉम्पॅक्ट करत आहे…')
                  : tx('Upload Combined Manifest PDF (e.g. raw_15_Manifest.pdf)', 'एकत्रित मॅनिफेस्ट PDF येथे अपलोड करा (उदा. raw_15_Manifest.pdf)')}
              </span>
              <span className="text-[10px] text-charcoal-light mt-0.5 block">
                {tx('Automatically detects signatures on every page, crops excess white space, and packs them tightly.', 'प्रत्येक पानाची स्वाक्षरी ओळखते, नको असलेली जागा काढून A4 पानात व्यवस्थित बसवते.')}
              </span>
              <input
                type="file"
                accept="application/pdf"
                disabled={cleaningSingleManifest}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleCleanSingleManifestPdf(f);
                }}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      {/* TAB 4: DIRECT SINGLE / MULTI-PAGE MANIFEST WHITE SPACE CUTTER */}
      {activeTab === 'multi_manifest_cleaner' && (
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-amber-300 shadow-sm space-y-6">
          <div className="max-w-3xl space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-gold text-charcoal shadow-2xs">
                {tx('Dedicated Manifest White Space Remover', 'मॅनिफेस्ट पांढरी जागा कापणारे टूल')}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                {tx('e.g. raw_15_Manifest.pdf', 'उदा. raw_15_Manifest.pdf')}
              </span>
            </div>
            <h2 className="font-serif text-2xl font-bold text-charcoal">
              {tx('Remove Blank Space from Downloaded Shiprocket Manifests', 'Shiprocket वरून डाऊनलोड केलेल्या मॅनिफेस्ट मधील पांढरी जागा काढा')}
            </h2>
            <p className="text-xs sm:text-sm text-charcoal-light leading-relaxed">
              {tx(
                'When you select multiple scheduled pickups in Shiprocket, it downloads a single PDF where each manifest has massive blank white space taking up a full A4 sheet. Upload that file right here — our engine automatically crops every manifest up to its signatures and combines them 2-3 per A4 sheet, eliminating paper waste completely.',
                'Shiprocket डॅशबोर्डवर अनेक मॅनिफेस्ट एकदम डाऊनलोड केल्यास प्रत्येक पानावर खाली खूप पांढरी मोकळी जागा राहून पाने वाया जातात. ती एकच PDF फाईल येथे अपलोड करा — आमची सिस्टीम प्रत्येक मॅनिफेस्टची स्वाक्षरी ओळखून नको असलेला भाग कापते आणि २ ते ३ मॅनिफेस्ट एकाच A4 पानात व्यवस्थित बसवून नवीन फाईल तयार करते.'
              )}
            </p>
          </div>

          <div className="pt-2">
            <label className="block w-full border-2 border-dashed border-gold hover:border-gold-dark rounded-3xl p-10 text-center cursor-pointer bg-ivory/40 hover:bg-gold/10 transition-all shadow-inner">
              <div className="w-14 h-14 rounded-2xl bg-gold/20 text-gold-dark flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-7 h-7 text-charcoal" />
              </div>
              <span className="text-base font-bold text-charcoal block">
                {cleaningSingleManifest
                  ? tx('Cutting White Spaces & Re-packing Pages…', 'पांढरी जागा काढून पाने तयार करत आहे…')
                  : tx('Click or Drag & Drop Manifest PDF Here', 'मॅनिफेस्ट PDF येथे क्लिक करून किंवा ड्रॅग करून अपलोड करा')}
              </span>
              <span className="text-xs text-charcoal-light mt-1 block">
                {tx('Supports any single or multi-page Shiprocket manifest PDF (e.g. raw_15_Manifest.pdf)', 'कोणतीही सिंगल किंवा मल्टि-पेज Shiprocket मॅनिफेस्ट PDF स्वीकारली जाईल')}
              </span>
              <span className="inline-block mt-3 px-4 py-1.5 rounded-xl bg-charcoal text-white text-xs font-semibold shadow-xs">
                {tx('Select File', 'फाईल निवडा')}
              </span>
              <input
                type="file"
                accept="application/pdf"
                disabled={cleaningSingleManifest}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleCleanSingleManifestPdf(f);
                }}
                className="hidden"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border-warm/60 text-xs">
            <div className="p-4 rounded-2xl bg-ivory/60 border border-border-warm space-y-1">
              <div className="font-bold text-charcoal flex items-center gap-1.5">
                <Scissors className="w-4 h-4 text-gold" />
                <span>{tx('1. Smart Signature Crop', '१. स्वाक्षरीनुसार कट')}</span>
              </div>
              <p className="text-charcoal-light text-[11px]">
                {tx('Detects FE & Seller signatures, trimming only unused footer space.', 'फक्त नको असलेली मोकळी जागा काढून स्वाक्षरी सुरक्षित ठेवते.')}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-ivory/60 border border-border-warm space-y-1">
              <div className="font-bold text-charcoal flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-gold" />
                <span>{tx('2. 2-to-3 per A4', '२. एका पानात २ ते ३')}</span>
              </div>
              <p className="text-charcoal-light text-[11px]">
                {tx('Packs multiple courier manifests tightly onto standard A4 portrait sheets.', 'सर्व कुरिअरचे मॅनिफेस्ट सुटसुटीतपणे एकाच पानात बसवते.')}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-ivory/60 border border-border-warm space-y-1">
              <div className="font-bold text-charcoal flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-gold" />
                <span>{tx('3. Zero Paper Waste', '३. कागद बचत')}</span>
              </div>
              <p className="text-charcoal-light text-[11px]">
                {tx('Instant download & print-ready preview directly in the browser.', 'थेट ब्राऊझरमधून डाऊनलोड आणि प्रिंट करण्यासाठी तयार.')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PDF PREVIEW MODAL */}
      {previewModalOpen && pdfPreviewUrl && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-border-warm">
            <div className="p-4 sm:p-5 border-b border-border-warm flex items-center justify-between bg-ivory/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gold/20 text-charcoal flex items-center justify-center">
                  <Printer className="w-4 h-4 text-gold-dark" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-charcoal text-base">
                    {tx('Generated PDF Preview', 'तयार केलेल्या PDF चे प्रिव्ह्यू')}
                  </h3>
                  <div className="text-[11px] text-charcoal-light">
                    {tx('Ready for standard A4 landscape or portrait printing', 'A4 प्रिंटिंगसाठी सज्ज')}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={pdfPreviewUrl}
                  download="Shubhangi_Print_A4.pdf"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gold text-charcoal font-bold text-xs hover:bg-gold-light transition-all shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{tx('Download PDF', 'PDF डाऊनलोड करा')}</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewModalOpen(false)}
                  className="p-2 rounded-xl hover:bg-charcoal/10 text-charcoal transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 p-2 sm:p-4 bg-charcoal/5 min-h-[500px]">
              <iframe
                src={pdfPreviewUrl}
                className="w-full h-full min-h-[550px] rounded-2xl border border-border-warm bg-white"
                title="PDF Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

