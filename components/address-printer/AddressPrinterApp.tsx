'use client';

import React, { useState } from 'react';
import { parseWhatsAppBatch, ParseResult, SAMPLE_DATA } from '@/lib/address-printer/parser';
import { Order } from '@/lib/address-printer/order';
import ReviewScreen from './ReviewScreen';
import PrintPreview from './PrintPreview';
import { Sparkles, Printer, FileText, CheckCircle2, RotateCcw } from 'lucide-react';

type Screen = 'input' | 'review' | 'print';

export default function AddressPrinterApp() {
  const [screen, setScreen] = useState<Screen>("input");
  const [rawInput, setRawInput] = useState("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  function handleGenerate() {
    if (!rawInput.trim()) return;
    const result = parseWhatsAppBatch(rawInput);
    setParseResult(result);
    setOrders(result.orders);
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

  if (screen === 'review' && parseResult) {
    return (
      <ReviewScreen
        orders={orders}
        preamble={parseResult.preamble}
        duplicates={parseResult.duplicates}
        onOrdersChange={setOrders}
        onProceedToPrint={() => setScreen('print')}
        onBack={() => setScreen('input')}
      />
    );
  }

  if (screen === 'print') {
    return (
      <PrintPreview
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
            <Printer className="w-3.5 h-3.5" />
            Shipping &amp; Courier Logistics
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-charcoal tracking-tight mb-2">
            Address Print Utility
          </h1>
          <p className="text-charcoal-light text-sm max-w-lg mx-auto">
            Paste confirmed WhatsApp orders to instantly parse addresses, detect reseller From blocks, and pack dynamically onto A4 print sheets.
          </p>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 mb-8 select-none">
          {[
            { n: 1, label: 'Paste Batch' },
            { n: 2, label: 'Auto Parse' },
            { n: 3, label: 'Review & Edit' },
            { n: 4, label: 'Print A4' },
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
              {i < arr.length - 1 && (
                <div className="w-6 sm:w-10 h-px bg-border-warm" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Input Card */}
        <div className="bg-white rounded-2xl border border-border-warm shadow-xs p-6 sm:p-8">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <label
              htmlFor="wa-input"
              className="block text-sm font-semibold text-charcoal"
            >
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
              Dynamic A4 Packing
            </div>
            <p className="text-xs text-charcoal-light leading-relaxed">
              No rigid 9-box grids. Blocks expand for long addresses and compress for short ones across 3 columns.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-xs rounded-xl p-4 border border-border-warm">
            <div className="flex items-center gap-2 text-charcoal font-semibold text-sm mb-1.5">
              <CheckCircle2 className="w-4 h-4 text-gold" />
              Reseller / From Support
            </div>
            <p className="text-xs text-charcoal-light leading-relaxed">
              Preserves custom From / Reseller phone numbers and brand names verbatim for dropship parcels.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-xs rounded-xl p-4 border border-border-warm">
            <div className="flex items-center gap-2 text-charcoal font-semibold text-sm mb-1.5">
              <CheckCircle2 className="w-4 h-4 text-gold" />
              Direct PDF &amp; Laser Print
            </div>
            <p className="text-xs text-charcoal-light leading-relaxed">
              Clean vector text with zero Canva or manual copy-pasting required. Print directly from browser.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
