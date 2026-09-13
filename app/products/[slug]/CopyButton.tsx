'use client';
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center justify-center gap-2 w-full border border-border-warm text-charcoal hover:border-gold hover:text-gold font-medium py-3 px-6 rounded-xl transition-colors text-sm"
      aria-label="Copy product link"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 text-green-600" />
          <span className="text-green-600">Link Copied!</span>
        </>
      ) : (
        <>
          <Copy className="w-4 h-4" />
          Copy Product Link
        </>
      )}
    </button>
  );
}
