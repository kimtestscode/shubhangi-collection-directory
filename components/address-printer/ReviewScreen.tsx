'use client';

import React, { useState, useMemo } from 'react';
import { Order } from '@/lib/address-printer/order';
import {
  ArrowLeft, Printer, Trash2, ArrowUp, ArrowDown, Edit3, Check, X,
  AlertTriangle, AlertCircle, CheckCircle2, Filter, AlertOctagon
} from 'lucide-react';

interface Props {
  orders: Order[];
  preamble: string;
  duplicates: string[];
  onOrdersChange: (orders: Order[]) => void;
  onProceedToPrint: () => void;
  onBack: () => void;
}

interface EditingState {
  id: string;
  orderNumber: string;
  name: string;
  address: string;
  landmark: string;
  district: string;
  city: string;
  state: string;
  pincode: string;
  mobile: string;
  fromRaw: string;
}

function orderToEditing(o: Order): EditingState {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    name: o.to.name,
    address: o.to.address,
    landmark: o.to.landmark ?? '',
    district: o.to.district ?? '',
    city: o.to.city ?? '',
    state: o.to.state ?? '',
    pincode: o.to.pincode ?? '',
    mobile: o.to.mobile ?? '',
    fromRaw: o.from.rawBlock,
  };
}

function applyEditing(o: Order, e: EditingState): Order {
  // Re-check warnings on edit
  const warnings: string[] = [];
  if (!e.name.trim()) warnings.push('Recipient name not detected');
  if (!e.address.trim()) warnings.push('Address not detected');
  if (!e.mobile.trim()) {
    warnings.push('Mobile number not detected');
  } else {
    const cleanDigits = e.mobile.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      warnings.push(`Mobile number has fewer than 10 digits (${e.mobile})`);
    }
  }
  if (!e.pincode.trim() || !/^\d{6}$/.test(e.pincode.replace(/\s+/g, ''))) {
    warnings.push('Pincode does not look like a valid 6-digit Indian pincode');
  }
  if (!e.fromRaw.trim()) warnings.push('From / reseller information missing');

  return {
    ...o,
    orderNumber: e.orderNumber.trim(),
    warnings,
    to: {
      ...o.to,
      name: e.name.trim(),
      address: e.address.trim(),
      landmark: e.landmark.trim() || undefined,
      district: e.district.trim() || undefined,
      city: e.city.trim() || undefined,
      state: e.state.trim() || undefined,
      pincode: e.pincode.trim() || undefined,
      mobile: e.mobile.trim() || undefined,
    },
    from: {
      ...o.from,
      rawBlock: e.fromRaw,
      name: e.fromRaw.split('\n')[0] || undefined,
    },
  };
}

export default function ReviewScreen({
  orders,
  preamble,
  onOrdersChange,
  onProceedToPrint,
  onBack,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditingState | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'flagged'>('all');
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  // Reassign inputs for duplicate order banner: { [orderId]: string }
  const [reassignInputs, setReassignInputs] = useState<Record<string, string>>({});

  // Dynamically compute duplicate order numbers based on current orders state
  const duplicateOrderNumbers = useMemo(() => {
    const counts = new Map<string, number>();
    for (const o of orders) {
      const num = o.orderNumber.trim();
      if (num) counts.set(num, (counts.get(num) ?? 0) + 1);
    }
    return [...counts.entries()].filter(([, c]) => c > 1).map(([n]) => n);
  }, [orders]);

  // Orders that have any abnormalities (duplicates, missing/invalid fields)
  const flaggedOrderIds = useMemo(() => {
    const set = new Set<string>();
    for (const o of orders) {
      const isDup = duplicateOrderNumbers.includes(o.orderNumber.trim());
      if (isDup || o.warnings.length > 0) {
        set.add(o.id);
      }
    }
    return set;
  }, [orders, duplicateOrderNumbers]);

  function startEdit(o: Order) {
    setEditingId(o.id);
    setEditState(orderToEditing(o));
  }

  function saveEdit() {
    if (!editState) return;
    const updated = orders.map((o) =>
      o.id === editState.id ? applyEditing(o, editState) : o
    );
    onOrdersChange(updated);
    setEditingId(null);
    setEditState(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditState(null);
  }

  function deleteOrder(id: string) {
    onOrdersChange(orders.filter((o) => o.id !== id));
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    const updated = [...orders];
    [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
    onOrdersChange(updated);
  }

  function moveDown(idx: number) {
    if (idx === orders.length - 1) return;
    const updated = [...orders];
    [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
    onOrdersChange(updated);
  }

  function handleReassignOrderNumber(orderId: string, newNumber: string) {
    const cleanNum = newNumber.replace(/\D/g, '').trim();
    if (!cleanNum) {
      alert('Please enter a valid numeric order number.');
      return;
    }
    const updated = orders.map((o) => {
      if (o.id !== orderId) return o;
      return {
        ...o,
        orderNumber: cleanNum,
      };
    });
    onOrdersChange(updated);
    setReassignInputs((prev) => {
      const next = { ...prev };
      delete next[orderId];
      return next;
    });
  }

  function handleProceed() {
    if (duplicateOrderNumbers.length > 0) {
      setShowDuplicateModal(true);
      return;
    }
    onProceedToPrint();
  }

  const displayedOrders = useMemo(() => {
    if (filterMode === 'flagged') {
      return orders.filter((o) => flaggedOrderIds.has(o.id));
    }
    return orders;
  }, [orders, filterMode, flaggedOrderIds]);

  const Field = ({
    label,
    value,
    field,
    multiline = false,
  }: {
    label: string;
    value: string;
    field: keyof EditingState;
    multiline?: boolean;
  }) => {
    const isEditing = editingId !== null && editState?.id === editingId;
    return (
      <div className="mb-2">
        <label className="block text-[11px] font-semibold text-gold uppercase tracking-wide mb-0.5">
          {label}
        </label>
        {isEditing ? (
          multiline ? (
            <textarea
              className="w-full text-sm border border-gold/40 rounded-lg px-2.5 py-1.5 bg-white text-charcoal focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 resize-y min-h-[60px]"
              value={editState ? String(editState[field]) : ''}
              onChange={(e) =>
                setEditState((prev) =>
                  prev ? { ...prev, [field]: e.target.value } : prev
                )
              }
            />
          ) : (
            <input
              className="w-full text-sm border border-gold/40 rounded-lg px-2.5 py-1 bg-white text-charcoal focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30"
              value={editState ? String(editState[field]) : ''}
              onChange={(e) =>
                setEditState((prev) =>
                  prev ? { ...prev, [field]: e.target.value } : prev
                )
              }
            />
          )
        ) : (
          <p className="text-sm text-charcoal whitespace-pre-wrap break-words">
            {value || <span className="text-charcoal-light/40 italic">—</span>}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-ivory pb-24">
      {/* Header Bar */}
      <header className="bg-white border-b border-border-warm shadow-xs sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-serif font-semibold text-charcoal">Review Orders</h1>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-charcoal-light">
              <span>
                <strong className="text-gold font-bold">{orders.length}</strong> order{orders.length !== 1 ? 's' : ''} detected
              </span>
              {duplicateOrderNumbers.length > 0 && (
                <span className="text-red-600 font-bold inline-flex items-center gap-1 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                  <AlertOctagon className="w-3.5 h-3.5" />
                  {duplicateOrderNumbers.length} Duplicate #{duplicateOrderNumbers.length > 1 ? 's' : ''}
                </span>
              )}
              {flaggedOrderIds.size > 0 && duplicateOrderNumbers.length === 0 && (
                <span className="text-amber-700 font-semibold inline-flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {flaggedOrderIds.size} Need{flaggedOrderIds.size > 1 ? '' : 's'} Review
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-border-warm text-charcoal hover:bg-ivory-dark transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <button
              onClick={handleProceed}
              disabled={orders.length === 0}
              className={`inline-flex items-center gap-2 px-5 py-2 text-xs sm:text-sm rounded-xl font-medium transition-all shadow-xs disabled:opacity-50 ${
                duplicateOrderNumbers.length > 0
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-gold hover:bg-gold/90 text-white'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>Generate Print Sheet →</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Preamble warning */}
        {preamble && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <strong className="font-semibold">Text found before first order number:</strong>
              <pre className="mt-1 whitespace-pre-wrap text-xs bg-amber-100/50 p-2.5 rounded-xl border border-amber-200 text-amber-900 font-mono">
                {preamble}
              </pre>
            </div>
          </div>
        )}

        {/* 🚨 CRITICAL DUPLICATE ORDER NUMBER RESOLUTION BANNER 🚨 */}
        {duplicateOrderNumbers.length > 0 && (
          <div className="p-4 sm:p-5 bg-red-50 border-2 border-red-400 rounded-3xl text-red-950 space-y-3.5 shadow-sm">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0">
                  <AlertOctagon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-red-900">
                    Duplicate Order Numbers Detected ({duplicateOrderNumbers.map((d) => `#${d}`).join(', ')})
                  </h3>
                  <p className="text-xs text-red-800">
                    Two or more addresses have been assigned the <strong>same order number</strong>. This causes duplicate labels, conflicting QR codes, and pickup scanning errors. Please assign unique order numbers below:
                  </p>
                </div>
              </div>
            </div>

            {/* List all duplicates and provide 1-click reassign input */}
            <div className="space-y-2.5 pt-1">
              {duplicateOrderNumbers.map((dupNum) => {
                const affectedOrders = orders.filter((o) => o.orderNumber.trim() === dupNum);

                return (
                  <div
                    key={dupNum}
                    className="p-3.5 bg-white border border-red-300 rounded-2xl shadow-2xs space-y-3"
                  >
                    <div className="text-xs font-bold text-red-900 flex items-center gap-1.5 uppercase tracking-wider">
                      <span>Conflict for Order #{dupNum}:</span>
                      <span className="font-mono text-charcoal">
                        ({affectedOrders.length} addresses sharing this number)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {affectedOrders.map((ord, oIdx) => {
                        const inputValue = reassignInputs[ord.id] ?? '';

                        return (
                          <div
                            key={ord.id}
                            className="p-3 rounded-xl border border-border-warm bg-ivory/40 flex flex-col justify-between gap-2"
                          >
                            <div>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="font-bold text-charcoal">
                                  Instance {oIdx + 1}: {ord.to.name || 'Unnamed Recipient'}
                                </span>
                                <span className="text-[11px] text-charcoal-light font-mono">
                                  {ord.to.mobile || 'No mobile'}
                                </span>
                              </div>
                              <p className="text-xs text-charcoal-light line-clamp-2">
                                {[ord.to.address, ord.to.city, ord.to.pincode].filter(Boolean).join(', ')}
                              </p>
                            </div>

                            {/* Reassign action */}
                            <div className="pt-2 border-t border-border-warm/80 flex items-center gap-2">
                              <input
                                placeholder={`New Order #`}
                                value={inputValue}
                                onChange={(e) =>
                                  setReassignInputs((prev) => ({
                                    ...prev,
                                    [ord.id]: e.target.value,
                                  }))
                                }
                                inputMode="numeric"
                                className="w-28 text-xs font-mono font-bold px-2 py-1.5 border border-border-warm rounded-lg bg-white focus:outline-none focus:border-gold"
                              />
                              <button
                                onClick={() => handleReassignOrderNumber(ord.id, inputValue)}
                                disabled={!inputValue.trim()}
                                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 transition-colors shadow-2xs"
                              >
                                Rename
                              </button>
                              <button
                                onClick={() => startEdit(ord)}
                                className="text-xs text-charcoal-light hover:text-charcoal underline ml-auto"
                              >
                                Edit Details
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter Bar: All vs Flagged / Needs Attention */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                filterMode === 'all'
                  ? 'bg-charcoal text-white shadow-xs'
                  : 'bg-white text-charcoal-light border border-border-warm hover:bg-ivory'
              }`}
            >
              <span>All Orders</span>
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-black/15 font-bold">
                {orders.length}
              </span>
            </button>

            <button
              onClick={() => setFilterMode('flagged')}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                filterMode === 'flagged'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-charcoal-light border border-border-warm hover:bg-ivory'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Needs Attention / Flagged</span>
              <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                flaggedOrderIds.size > 0 ? 'bg-red-500 text-white' : 'bg-black/10'
              }`}>
                {flaggedOrderIds.size}
              </span>
            </button>
          </div>

          {filterMode === 'flagged' && (
            <span className="text-xs text-charcoal-light">
              Showing {displayedOrders.length} order{displayedOrders.length !== 1 ? 's' : ''} with warnings or duplicate numbers
            </span>
          )}
        </div>

        {/* Order cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedOrders.map((order, idx) => {
            const isEditing = editingId === order.id;
            const isDuplicate = duplicateOrderNumbers.includes(order.orderNumber.trim());
            const hasWarnings = order.warnings.length > 0 || isDuplicate;

            return (
              <div
                key={order.id}
                className={`bg-white rounded-3xl border transition-all flex flex-col justify-between ${
                  isDuplicate
                    ? 'border-2 border-red-500 shadow-md ring-2 ring-red-400/20'
                    : hasWarnings
                    ? 'border-amber-300 shadow-xs'
                    : 'border-border-warm shadow-2xs hover:shadow-xs'
                }`}
              >
                {/* Card Top */}
                <div className={`p-4 border-b border-border-warm rounded-t-3xl flex items-center justify-between ${
                  isDuplicate ? 'bg-red-50/80' : 'bg-ivory-dark/40'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-gold/15 text-gold font-bold text-xs flex items-center justify-center font-mono">
                      {idx + 1}
                    </span>
                    {isEditing ? (
                      <input
                        className="text-sm font-bold border border-gold/40 rounded-lg px-2 py-0.5 bg-white text-charcoal font-mono w-28"
                        value={editState?.orderNumber || ''}
                        onChange={(e) =>
                          setEditState((prev) =>
                            prev ? { ...prev, orderNumber: e.target.value } : prev
                          )
                        }
                      />
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-charcoal font-mono tracking-tight">
                          ORDER #{order.orderNumber}
                        </span>
                        {isDuplicate && (
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-red-600 text-white animate-pulse">
                            Duplicate!
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Reorder / Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveUp(idx)}
                      disabled={idx === 0}
                      title="Move up"
                      className="p-1 rounded text-charcoal-light/60 hover:text-charcoal hover:bg-ivory-dark disabled:opacity-20 transition-colors"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveDown(idx)}
                      disabled={idx === orders.length - 1}
                      title="Move down"
                      className="p-1 rounded text-charcoal-light/60 hover:text-charcoal hover:bg-ivory-dark disabled:opacity-20 transition-colors"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteOrder(order.id)}
                      title="Delete order"
                      className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Warnings Section */}
                {(isDuplicate || order.warnings.length > 0) && !isEditing && (
                  <div className={`px-4 py-2 border-b text-xs space-y-1 ${
                    isDuplicate
                      ? 'bg-red-100/70 border-red-200 text-red-900'
                      : 'bg-amber-50/70 border-amber-100 text-amber-800'
                  }`}>
                    {isDuplicate && (
                      <div className="flex items-center gap-1.5 font-bold text-red-700">
                        <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                        <span>Order #{order.orderNumber} is assigned to multiple addresses!</span>
                      </div>
                    )}
                    {order.warnings
                      .filter((w) => !w.toLowerCase().includes('duplicate'))
                      .map((w, wi) => (
                        <div key={wi} className="flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>{w}</span>
                        </div>
                      ))}
                  </div>
                )}

                {/* Card Body */}
                <div className="p-4 flex-1 space-y-3">
                  {/* Recipient / To */}
                  <div>
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-gold bg-gold/10 px-2 py-0.5 rounded mb-2">
                      To (Recipient)
                    </span>
                    <Field label="Name" value={order.to.name} field="name" />
                    <Field label="Address" value={order.to.address} field="address" multiline />
                    <Field label="Landmark" value={order.to.landmark ?? ''} field="landmark" />
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="District/City" value={order.to.district || order.to.city || ''} field="district" />
                      <Field label="State" value={order.to.state ?? ''} field="state" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Pincode" value={order.to.pincode ?? ''} field="pincode" />
                      <Field label="Mobile" value={order.to.mobile ?? ''} field="mobile" />
                    </div>
                  </div>

                  {/* Sender / From */}
                  <div className="pt-2 border-t border-border-warm">
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-charcoal-light bg-ivory-dark px-2 py-0.5 rounded mb-2">
                      From (Sender / Reseller)
                    </span>
                    <Field label="Sender Block" value={order.from.rawBlock} field="fromRaw" multiline />
                  </div>
                </div>

                {/* Card Footer / Edit Toggle */}
                <div className="p-3 border-t border-border-warm bg-ivory/50 rounded-b-3xl flex justify-end gap-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={cancelEdit}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-xl border border-border-warm text-charcoal-light hover:bg-white transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        Cancel
                      </button>
                      <button
                        onClick={saveEdit}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-xl bg-gold text-white hover:bg-gold/90 transition-colors font-medium shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Save Changes
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => startEdit(order)}
                      className="inline-flex items-center gap-1 text-xs text-gold hover:text-gold/80 font-medium px-2.5 py-1 rounded-lg hover:bg-gold/5 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit Details
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmation Modal when attempting to print with unresolved duplicate order numbers */}
      {showDuplicateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-red-300 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertOctagon className="w-7 h-7" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-serif text-lg font-bold text-charcoal">
                Duplicate Order Numbers Detected!
              </h3>
              <p className="text-xs text-charcoal-light leading-relaxed">
                Order number(s) <strong>{duplicateOrderNumbers.map((d) => `#${d}`).join(', ')}</strong> are assigned to multiple addresses. Printing will produce parcels with the same QR code and cause pickup scanning conflicts.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => setShowDuplicateModal(false)}
                className="w-full py-2.5 rounded-xl bg-charcoal text-white text-xs font-semibold hover:bg-charcoal/90 transition-colors shadow-xs"
              >
                ← Return &amp; Reassign Unique Order Numbers (Recommended)
              </button>
              <button
                onClick={() => {
                  setShowDuplicateModal(false);
                  onProceedToPrint();
                }}
                className="w-full py-2 rounded-xl border border-red-300 text-red-700 hover:bg-red-50 text-xs font-semibold transition-colors"
              >
                Proceed to Print Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
