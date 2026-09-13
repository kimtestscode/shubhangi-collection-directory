'use client';
import { useState, useRef } from 'react';
import { X, Upload, Download, FileSpreadsheet, Check, AlertCircle, Loader2 } from 'lucide-react';
import { parseCSVToProducts, generateSampleCSV } from '@/lib/csv';
import { ProductInsert } from '@/lib/types';
import PriceDisplay from '@/components/shared/PriceDisplay';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export default function CSVImportModal({ isOpen, onClose, onImportComplete }: Props) {
  const [parsed, setParsed] = useState<Partial<ProductInsert>[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError('');
    setSuccessCount(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const products = parseCSVToProducts(text);
        if (products.length === 0) {
          setError('No valid products found in CSV file. Check CSV header names.');
        } else {
          setParsed(products);
        }
      } catch (err: any) {
        setError('Failed to parse CSV file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadSample = () => {
    const csv = generateSampleCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shubhangi_products_sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (parsed.length === 0) return;
    setImporting(true);
    setError('');

    try {
      const res = await fetch('/api/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessCount(data.count || parsed.length);
        setTimeout(() => {
          onImportComplete();
          onClose();
        }, 1500);
      } else {
        setError(data.error || 'Failed to import products.');
      }
    } catch (err: any) {
      setError('Import failed: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-border-warm max-w-2xl w-full p-6 space-y-6 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-border-warm pb-4">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-gold" />
            <div>
              <h2 className="font-serif text-xl font-semibold text-charcoal">Import Products from CSV</h2>
              <p className="text-xs text-charcoal-light">Upload products with Regular MRP Price and Offer Price slash pricing.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-charcoal-light hover:text-charcoal rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 flex-1 overflow-y-auto pr-1">
          <div className="flex items-center justify-between bg-ivory-dark p-3 rounded-xl text-xs text-charcoal-light">
            <span>Download our sample CSV with Regular & Offer price fields.</span>
            <button
              onClick={handleDownloadSample}
              className="flex items-center gap-1.5 bg-white border border-border-warm hover:border-gold px-3 py-1.5 rounded-lg text-charcoal font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Sample CSV
            </button>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border-warm hover:border-gold rounded-xl p-8 text-center cursor-pointer transition-colors bg-ivory/40 hover:bg-ivory"
          >
            <Upload className="w-8 h-8 text-gold mx-auto mb-2" />
            <p className="text-sm font-medium text-charcoal">
              {fileName ? fileName : 'Click to select CSV file'}
            </p>
            <p className="text-xs text-charcoal-light mt-1">Columns: SKU, Name, Type, Color, Regular Price, Offer Price, Category, Images</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-xs border border-red-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successCount !== null && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-xl text-xs border border-green-200">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>Successfully imported {successCount} products! Refreshing catalogue...</span>
            </div>
          )}

          {parsed.length > 0 && successCount === null && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-charcoal">Preview ({parsed.length} products ready to import):</p>
              <div className="border border-border-warm rounded-xl overflow-hidden max-h-48 overflow-y-auto text-xs">
                <table className="w-full text-left">
                  <thead className="bg-ivory-dark border-b border-border-warm sticky top-0">
                    <tr>
                      <th className="p-2">SKU</th>
                      <th className="p-2">Name</th>
                      <th className="p-2">Type</th>
                      <th className="p-2">Price (Offer / MRP)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-warm">
                    {parsed.map((p, idx) => (
                      <tr key={idx} className="hover:bg-ivory/50">
                        <td className="p-2 font-mono font-medium">{p.sku}</td>
                        <td className="p-2">{p.name}</td>
                        <td className="p-2 capitalize">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                            p.product_type === 'variable' ? 'bg-amber-100 text-amber-800' :
                            p.product_type === 'variation' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {p.product_type || 'simple'}
                          </span>
                        </td>
                        <td className="p-2">
                          <PriceDisplay price={p.price ?? null} regularPrice={p.regular_price ?? null} currency={p.currency} size="sm" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border-warm">
          <button
            onClick={onClose}
            className="border border-border-warm text-charcoal hover:border-gold px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={parsed.length === 0 || importing || successCount !== null}
            className="flex items-center gap-2 bg-gold hover:bg-gold/90 text-white font-medium px-5 py-2 rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            {importing && <Loader2 className="w-4 h-4 animate-spin" />}
            {importing ? 'Importing...' : `Import ${parsed.length} Products`}
          </button>
        </div>
      </div>
    </div>
  );
}
