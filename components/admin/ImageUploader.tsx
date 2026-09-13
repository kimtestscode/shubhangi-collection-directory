'use client';
import { useState, useRef } from 'react';
import Image from 'next/image';
import { Upload, X, Loader2 } from 'lucide-react';

interface Props {
  images: string[];
  onChange: (images: string[]) => void;
}

export default function ImageUploader({ images, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList) => {
    setUploading(true);
    setError('');
    const newUrls: string[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) { setError('Only image files allowed.'); continue; }
      if (file.size > 5 * 1024 * 1024) { setError('Max file size is 5MB.'); continue; }

      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.url) newUrls.push(data.url);
      else setError(data.error || 'Upload failed.');
    }

    onChange([...images, ...newUrls]);
    setUploading(false);
  };

  const remove = (url: string) => onChange(images.filter((u) => u !== url));

  return (
    <div className="space-y-3">
      {/* Existing images */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {images.map((url, i) => (
            <div key={url} className="relative w-24 h-24 rounded-xl overflow-hidden border border-border-warm group">
              <Image src={url} alt={`Product image ${i + 1}`} fill className="object-cover" sizes="96px" />
              <button
                type="button"
                onClick={() => remove(url)}
                className="absolute top-1 right-1 bg-black/60 hover:bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove image"
              >
                <X className="w-3 h-3" />
              </button>
              {i === 0 && (
                <span className="absolute bottom-1 left-1 bg-gold text-white text-[9px] px-1.5 py-0.5 rounded font-medium">
                  Thumbnail
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex flex-col items-center justify-center gap-2 w-full border-2 border-dashed border-border-warm hover:border-gold rounded-xl py-8 px-4 transition-colors disabled:opacity-50 text-charcoal-light hover:text-gold"
      >
        {uploading ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm">Uploading...</span>
          </>
        ) : (
          <>
            <Upload className="w-6 h-6" />
            <span className="text-sm font-medium">Click to upload images</span>
            <span className="text-xs">PNG, JPG up to 5MB each</span>
          </>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      {error && <p className="text-red-600 text-xs">{error}</p>}
      <p className="text-xs text-charcoal-light">First image will be used as the thumbnail.</p>
    </div>
  );
}
