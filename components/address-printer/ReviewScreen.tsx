'use client';

import React, { useState } from 'react';
import { Order } from '@/lib/address-printer/order';
import { ArrowLeft, Printer, Trash2, ArrowUp, ArrowDown, Edit3, Check, X, AlertTriangle, AlertCircle } from 'lucide-react';

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
  return {
    ...o,
    orderNumber: e.orderNumber,
    to: {
      ...o.to,
      name: e.name,
      address: e.address,
      landmark: e.landmark || undefined,
      district: e.district || undefined,
      city: e.city || undefined,
      state: e.state || undefined,
      pincode: e.pincode || undefined,
      mobile: e.mobile || undefined,
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
  duplicates,
  onOrdersChange,
  onProceedToPrint,
  onBack,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditingState | null>(null);
  const [, setKeepDuplicates] = useState<Set<string>>(new Set());

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

  function removeDuplicate(orderNumber: string) {
    let seen = false;
    onOrdersChange(
      orders.filter((o) => {
        if (o.orderNumber !== orderNumber) return true;
        if (!seen) {
          seen = true;
          return true;
        }
        return false;
      })
    );
  }

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
            <p className="text-xs text-charcoal-light">
              <span className="font-semibold text-gold">{orders.length}</span> order{orders.length !== 1 ? 's' : ''} detected
              {duplicates.length > 0 && (
                <span className="ml-2 text-amber-600 font-semibold inline-flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {duplicates.length} duplicate{duplicates.length > 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl border border-border-warm text-charcoal hover:bg-ivory-dark transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={onProceedToPrint}
              disabled={orders.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm rounded-xl bg-gold text-white font-medium hover:bg-gold/90 transition-colors shadow-xs disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              Generate Print Sheet →
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Preamble warning */}
        {preamble && (
          <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <strong className="font-medium">Text found before first order number:</strong>
              <pre className="mt-1 whitespace-pre-wrap text-xs bg-amber-100/50 p-2 rounded border border-amber-200 text-amber-900 font-mono">
                {preamble}
              </pre>
            </div>
          </div>
        )}

        {/* Duplicate warnings */}
        {duplicates.map((dup) => (
          <div
            key={dup}
            className="mb-3 p-3.5 bg-yellow-50 border border-yellow-300 rounded-xl flex items-center justify-between flex-wrap gap-2"
          >
            <div className="flex items-center gap-2 text-sm text-yellow-900 font-medium">
              <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0" />
              <span>
                Duplicate order number detected: <strong className="font-mono bg-yellow-200/60 px-1.5 py-0.5 rounded">{dup}</strong>
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setKeepDuplicates((prev) => new Set([...prev, dup]))}
                className="text-xs px-3 py-1.5 rounded-lg bg-white border border-yellow-400 text-yellow-900 hover:bg-yellow-100 transition-colors font-medium"
              >
                Keep both
              </button>
              <button
                onClick={() => removeDuplicate(dup)}
                className="text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium"
              >
                Remove duplicate
              </button>
            </div>
          </div>
        ))}

        {/* Order cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {orders.map((order, idx) => {
            const isEditing = editingId === order.id;

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl border transition-shadow flex flex-col justify-between ${
                  order.warnings.length > 0 ? 'border-amber-300 shadow-xs' : 'border-border-warm'
                }`}
              >
                {/* Card Top */}
                <div className="p-4 border-b border-border-warm bg-ivory-dark/40 rounded-t-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-gold/15 text-gold font-bold text-xs flex items-center justify-center font-mono">
                      {idx + 1}
                    </span>
                    {isEditing ? (
                      <input
                        className="text-sm font-bold border border-gold/40 rounded px-2 py-0.5 bg-white text-charcoal font-mono w-28"
                        value={editState?.orderNumber || ''}
                        onChange={(e) =>
                          setEditState((prev) =>
                            prev ? { ...prev, orderNumber: e.target.value } : prev
                          )
                        }
                      />
                    ) : (
                      <span className="font-bold text-sm text-charcoal font-mono tracking-tight">
                        ORDER #{order.orderNumber}
                      </span>
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

                {/* Warnings */}
                {order.warnings.length > 0 && !isEditing && (
                  <div className="px-4 py-2 bg-amber-50/70 border-b border-amber-100 text-xs text-amber-800 space-y-0.5">
                    {order.warnings.map((w, wi) => (
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
                <div className="p-3 border-t border-border-warm bg-ivory/50 rounded-b-2xl flex justify-end gap-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={cancelEdit}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-border-warm text-charcoal-light hover:bg-white transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        Cancel
                      </button>
                      <button
                        onClick={saveEdit}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-gold text-white hover:bg-gold/90 transition-colors font-medium shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Save Changes
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => startEdit(order)}
                      className="inline-flex items-center gap-1 text-xs text-gold hover:text-gold/80 font-medium px-2 py-1 rounded hover:bg-gold/5 transition-colors"
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
    </div>
  );
}
