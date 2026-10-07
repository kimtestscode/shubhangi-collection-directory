'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { parseWhatsAppBatch, ParseResult, SAMPLE_DATA } from '@/lib/address-printer/parser';
import { Order } from '@/lib/address-printer/order';
import ReviewScreen from '@/components/address-printer/ReviewScreen';
import ShippingPrintPreview from './ShippingPrintPreview';
import { Sparkles, QrCode, FileText, CheckCircle2, RotateCcw, ScanLine } from 'lucide-react';

/**
 * Copy of AddressPrinterApp for the QR / shipping-master experiment.
 * Same paste → parse → review → print flow; the print step adds an order-number QR.
 * Parser and ReviewScreen are shared read-only with the original printer.
 */

type Screen = 'input' | 'review' | 'print';

export default function ShippingPrinterApp() {
  const [screen, setScreen] = useState<Screen>('input');
  const [rawInput, setRawInput] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  async function syncOrdersToMaster(ordersToSync: Order[]) {
    if (!ordersToSync.length) return;
    try {
      await fetch('/api/shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_orders', orders: ordersToSync }),
      });
    } catch (err) {
      console.error('Failed to sync orders to shipping master:', err);
    }
  }

  function handleGenerate() {
    if (!rawInput.trim()) return;
    const result = parseWhatsAppBatch(rawInput);
    setParseResult(result);
    setOrders(result.orders);
    syncOrdersToMaster(result.orders);
    setScreen('review');
  }

  function handleLoadSample() {
    setRawInput(SAMPLE_DATA);
  }

  function handleClear() {
    setRawInput('');
    setParseResult(null);
    setOrders([]);
    setScreen('input');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleGenerate();
    }
  }

  function handleProceedToPrint() {
    syncOrdersToMaster(orders);
    setScreen('print');
  }

  if (screen === 'review' && parseResult) {
    return (
      <ReviewScreen
        orders={orders}
        preamble={parseResult.preamble}
        duplicates={parseResult.duplicates}
        onOrdersChange={setOrders}
        onProceedToPrint={handleProceedToPrint}
        onBack={() => setScreen('input')}
      />
    );
  }

  if (screen === 'print') {
    return (
      <ShippingPrintPreview
        orders={orders}
        onBack={() => setScreen('review')}
        onClear={handleClear}
      />
    );
  }

  return (
    <div className="min-h-screen bg-ivory flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-border-warm shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/20 text-gold text-xs font-medium uppercase tracking-widest mb-3">
            <QrCode className="w-3.5 h-3.5" />
            Shipping &amp; Pickup Scan · Beta
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-charcoal tracking-tight mb-2">
            Address Print + Scan QR
          </h1>
          <p className="text-charcoal-light text-sm max-w-lg mx-auto">
            Same address printer, with a small QR of the order number on every label. Scan it at pickup to log the parcel in the Shipping Master.
          </p>
          <Link
            href="/admin/shipping-master"
            className="inline-flex items-center gap-1.5 mt-4 text-xs font-semibold text-gold hover:underline"
          >
            <ScanLine className="w-3.5 h-3.5" />
            Open Shipping Master (scan &amp; records) →
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 mb-8 select-none">
          {[
            { n: 1, label: 'Paste Batch' },
            { n: 2, label: 'Auto Parse' },
            { n: 3, label: 'Review & Edit' },
            { n: 4, label: 'Print A4 + QR' },
          ].map(({ n, label }, i, arr) => (
            <React.Fragment key={n}>
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    n === 1
                      ? 'bg-gold text-white shadow-xs'
                      : 'bg-ivory-dark border border-border-warm text-charcoal-light'
                  }`}
                >
                  {n}
                </div>
                <span
                  className={`text-xs font-medium hidden sm:inline ${
                    n === 1 ? 'text-charcoal font-semibold' : 'text-charcoal-light/60'
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < arr.length - 1 && <div className="w-6 sm:w-10 h-px bg-border-warm" />}
            </React.Fragment>
          ))}
        </div>

        {/* Input Card */}
        <div className="bg-white rounded-2xl border border-border-warm shadow-xs p-6 sm:p-8">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <label htmlFor="wa-input" className="block text-sm font-semibold text-charcoal">
              Paste WhatsApp Messages
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleLoadSample}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-gold hover:text-gold/80 px-2.5 py-1 rounded-lg bg-gold/10 hover:bg-gold/15 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Load Sample Orders
              </button>
              {rawInput && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex items-center gap-1 text-xs text-charcoal-light hover:text-red-600 px-2 py-1 rounded transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>
          </div>

          <textarea
            id="wa-input"
            rows={14}
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Paste raw messages directly from WhatsApp here...\n\nExample format:\n*order no-14257*\nTo,\nName - Priya Sharma\nAddress: Flat 204, Sunflower CHS, Sector 19, Kharghar\nDistrict - Raigad, Maharashtra\nPincode - 410210\nMobile - 9876543210\n\nFrom,\nShubhangi Collection\nMob :- 9773915478`}
            className="w-full font-mono text-xs sm:text-sm border border-border-warm rounded-xl p-4 bg-ivory/50 text-charcoal placeholder-charcoal-light/40 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 resize-y transition-colors leading-relaxed"
          />

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-xs text-charcoal-light/70">
              💡 Press <kbd className="font-mono bg-ivory-dark border border-border-warm px-1.5 py-0.5 rounded text-[11px] text-charcoal">Ctrl+Enter</kbd> or <kbd className="font-mono bg-ivory-dark border border-border-warm px-1.5 py-0.5 rounded text-[11px] text-charcoal">⌘+Enter</kbd> to generate.
            </p>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={!rawInput.trim()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gold text-white font-semibold text-sm hover:bg-gold/90 transition-colors shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              Generate Print Sheet →
            </button>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="bg-white/80 backdrop-blur-xs rounded-xl p-4 border border-border-warm">
            <div className="flex items-center gap-2 text-charcoal font-semibold text-sm mb-1.5">
              <CheckCircle2 className="w-4 h-4 text-gold" />
              QR on Every Label
            </div>
            <p className="text-xs text-charcoal-light leading-relaxed">
              Each address block carries a small QR holding just the order number — nothing personal is encoded.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-xs rounded-xl p-4 border border-border-warm">
            <div className="flex items-center gap-2 text-charcoal font-semibold text-sm mb-1.5">
              <CheckCircle2 className="w-4 h-4 text-gold" />
              Scan at Pickup
            </div>
            <p className="text-xs text-charcoal-light leading-relaxed">
              When the delivery person collects parcels, scan each label. The date and time are logged automatically.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-xs rounded-xl p-4 border border-border-warm">
            <div className="flex items-center gap-2 text-charcoal font-semibold text-sm mb-1.5">
              <CheckCircle2 className="w-4 h-4 text-gold" />
              Original Printer Untouched
            </div>
            <p className="text-xs text-charcoal-light leading-relaxed">
              The regular Address Printer page works exactly as before — this is a separate experimental copy.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
