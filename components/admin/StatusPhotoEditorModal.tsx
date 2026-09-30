'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Download, Plus, Trash2, Move, Sparkles, Image as ImageIcon, Layers, RefreshCw, Loader2, Share2 } from 'lucide-react';

export interface TextBox {
  id: string;
  text: string;
  xPercent: number; // 0 - 100%
  yPercent: number; // 0 - 100%
  bg: 'black' | 'white' | 'gold' | 'crimson' | 'none';
  fontSize: number; // base size in px (e.g. 20)
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  productName: string;
  price?: number | null;
  regularPrice?: number | null;
}

const BG_STYLES: Record<TextBox['bg'], { bg: string; text: string; label: string }> = {
  black: { bg: 'rgba(0, 0, 0, 0.88)', text: '#ffffff', label: 'Black Pill' },
  white: { bg: 'rgba(255, 255, 255, 0.95)', text: '#111827', label: 'White Pill' },
  gold: { bg: 'rgba(180, 130, 40, 0.95)', text: '#ffffff', label: 'Gold Pill' },
  crimson: { bg: 'rgba(185, 28, 28, 0.92)', text: '#ffffff', label: 'Crimson' },
  none: { bg: 'transparent', text: '#ffffff', label: 'No Background' },
};

export default function StatusPhotoEditorModal({
  isOpen,
  onClose,
  images,
  productName,
  price,
  regularPrice,
}: Props) {
  const safeImages = images.filter(Boolean);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);

  // Check if Web Share API with files is supported (iOS Safari / Android Chrome)
  useEffect(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        const testFile = new File([''], 'test.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [testFile] })) {
          setCanShare(true);
        }
      } catch {
        setCanShare(false);
      }
    }
  }, []);

  // Initialize text boxes with realistic WhatsApp status story badges
  const [textBoxes, setTextBoxes] = useState<TextBox[]>(() => {
    const initial: TextBox[] = [];
    if (price) {
      initial.push({
        id: 'box-price',
        text: `ek piece Rs.${price} free shipping`,
        xPercent: 50,
        yPercent: 20,
        bg: 'black',
        fontSize: 22,
      });
    }
    if (productName) {
      initial.push({
        id: 'box-name',
        text: productName.length > 25 ? productName.slice(0, 25) + '...' : productName,
        xPercent: 50,
        yPercent: 78,
        bg: 'black',
        fontSize: 18,
      });
    }
    return initial;
  });

  // Reset or adjust if price changes
  useEffect(() => {
    if (isOpen && textBoxes.length === 0 && price) {
      setTextBoxes([
        {
          id: 'box-price',
          text: `ek piece Rs.${price} free shipping`,
          xPercent: 50,
          yPercent: 20,
          bg: 'black',
          fontSize: 22,
        },
      ]);
    }
  }, [isOpen, price, textBoxes.length]);

  const activeImage = safeImages[activeImgIdx] || '/placeholder.jpg';
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    boxId: string;
    startX: number;
    startY: number;
    startXPct: number;
    startYPct: number;
  } | null>(null);

  // Mouse / Touch Dragging Handlers
  const handleDragStart = (boxId: string, clientX: number, clientY: number) => {
    setSelectedBoxId(boxId);
    const box = textBoxes.find(b => b.id === boxId);
    if (!box) return;

    dragRef.current = {
      boxId,
      startX: clientX,
      startY: clientY,
      startXPct: box.xPercent,
      startYPct: box.yPercent,
    };
  };

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!dragRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const deltaX = clientX - dragRef.current.startX;
    const deltaY = clientY - dragRef.current.startY;

    const deltaXPct = (deltaX / rect.width) * 100;
    const deltaYPct = (deltaY / rect.height) * 100;

    const newXPct = Math.min(95, Math.max(5, dragRef.current.startXPct + deltaXPct));
    const newYPct = Math.min(95, Math.max(5, dragRef.current.startYPct + deltaYPct));

    setTextBoxes(prev => prev.map(b => b.id === dragRef.current!.boxId ? { ...b, xPercent: newXPct, yPercent: newYPct } : b));
  }, []);

  const handleDragEnd = useCallback(() => {
    dragRef.current = null;
  }, []);

  // Global event listeners with passive: false for touchmove to prevent mobile screen scrolling during drag
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleDragMove(e.clientX, e.clientY);
    const onMouseUp = () => handleDragEnd();
    
    const onTouchMove = (e: TouchEvent) => {
      if (dragRef.current && e.touches[0]) {
        if (e.cancelable) e.preventDefault(); // Stop mobile screen scrolling while dragging badge
        handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onTouchEnd = () => handleDragEnd();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [handleDragMove, handleDragEnd]);

  // Text Box CRUD
  const addTextBox = (presetText?: string) => {
    const newBox: TextBox = {
      id: `box-${Date.now()}`,
      text: presetText || 'Tap to edit text',
      xPercent: 50,
      yPercent: 50,
      bg: 'black',
      fontSize: 20,
    };
    setTextBoxes(prev => [...prev, newBox]);
    setSelectedBoxId(newBox.id);
  };

  const updateSelectedBox = (field: keyof TextBox, value: any) => {
    if (!selectedBoxId) return;
    setTextBoxes(prev => prev.map(b => b.id === selectedBoxId ? { ...b, [field]: value } : b));
  };

  const removeSelectedBox = () => {
    if (!selectedBoxId) return;
    setTextBoxes(prev => prev.filter(b => b.id !== selectedBoxId));
    setSelectedBoxId(null);
  };

  // Helper to load image via proxy or direct
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      const proxyUrl = src.startsWith('http') ? `/api/proxy-image?url=${encodeURIComponent(src)}` : src;
      img.src = proxyUrl;
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
    });
  };

  // Canvas Drawing & Export
  const generateCanvasImage = async (imgUrl: string): Promise<Blob> => {
    const img = await loadImage(imgUrl);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || 1080;
    canvas.height = img.naturalHeight || 1440;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // 1. Draw base photo
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // 2. Scale factor based on standard 500px preview width
    const scaleFactor = canvas.width / 500;

    // 3. Draw each text badge
    for (const box of textBoxes) {
      if (!box.text.trim()) continue;

      const lines = box.text.split('\n');
      const scaledFontSize = Math.max(14, Math.round(box.fontSize * scaleFactor * 0.9));
      ctx.font = `bold ${scaledFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

      const lineHeight = scaledFontSize * 1.35;
      const paddingX = scaledFontSize * 0.85;
      const paddingY = scaledFontSize * 0.45;

      // Measure max line width
      let maxLineWidth = 0;
      for (const line of lines) {
        const metrics = ctx.measureText(line);
        if (metrics.width > maxLineWidth) maxLineWidth = metrics.width;
      }

      const badgeWidth = maxLineWidth + paddingX * 2;
      const badgeHeight = lines.length * lineHeight + paddingY * 2;

      // Calculate center position
      const centerX = (box.xPercent / 100) * canvas.width;
      const centerY = (box.yPercent / 100) * canvas.height;
      const left = centerX - badgeWidth / 2;
      const top = centerY - badgeHeight / 2;
      const radius = Math.min(24 * scaleFactor, badgeHeight / 2);

      // Draw rounded background pill
      const style = BG_STYLES[box.bg] || BG_STYLES.black;
      if (box.bg !== 'none') {
        ctx.fillStyle = style.bg;
        ctx.beginPath();
        ctx.roundRect(left, top, badgeWidth, badgeHeight, radius);
        ctx.fill();
      }

      // Draw text lines
      ctx.fillStyle = style.text;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Subtle shadow for legibility
      if (box.bg === 'none') {
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 8 * scaleFactor;
      } else {
        ctx.shadowColor = 'transparent';
      }

      lines.forEach((line, idx) => {
        const lineY = top + paddingY + (idx + 0.5) * lineHeight;
        ctx.fillText(line, centerX, lineY);
      });
      ctx.shadowColor = 'transparent';
    }

    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      }, 'image/jpeg', 0.95);
    });
  };

  const handleDownloadCurrent = async () => {
    if (!activeImage) return;
    setIsExporting(true);
    try {
      const blob = await generateCanvasImage(activeImage);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanSlug = productName ? productName.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'status';
      a.download = `${cleanSlug}-status-${activeImgIdx + 1}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to generate image. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareStatus = async () => {
    if (!activeImage) return;
    setIsExporting(true);
    try {
      const blob = await generateCanvasImage(activeImage);
      const cleanSlug = productName ? productName.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'status';
      const file = new File([blob], `${cleanSlug}-status-${activeImgIdx + 1}.jpg`, { type: 'image/jpeg' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: productName || 'Product Status',
          text: price ? `${productName} - ₹${price}` : productName,
        });
      } else {
        await handleDownloadCurrent();
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error(err);
        await handleDownloadCurrent();
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadAll = async () => {
    if (safeImages.length === 0) return;
    setIsExporting(true);
    try {
      for (let i = 0; i < safeImages.length; i++) {
        const blob = await generateCanvasImage(safeImages[i]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const cleanSlug = productName ? productName.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'status';
        a.download = `${cleanSlug}-status-${i + 1}.jpg`;
        a.click();
        URL.revokeObjectURL(url);
        // Small delay between downloads
        await new Promise(r => setTimeout(r, 400));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to generate all images.');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  const selectedBox = textBoxes.find(b => b.id === selectedBoxId);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[96vh] sm:max-h-[92vh] border border-border-warm overflow-hidden my-auto">

        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border-warm flex items-center justify-between bg-ivory-dark/60">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 pr-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-gold/15 text-gold flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-semibold text-charcoal truncate">
                WhatsApp Status Photo Editor
              </h2>
              <p className="text-[11px] sm:text-xs text-charcoal-light hidden sm:block truncate">
                Drag price & details badges over your photo, then download or share directly to Status
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 text-charcoal-light hover:text-charcoal hover:bg-black/5 rounded-xl transition-colors flex-shrink-0"
            title="Close editor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 bg-ivory/20">

          {/* Canvas Preview Area (Left 7 Cols on desktop, Top on mobile) */}
          <div className="lg:col-span-7 flex flex-col items-center">
            {/* Interactive Image Container */}
            <div
              ref={containerRef}
              className="relative w-full max-w-[340px] sm:max-w-[420px] lg:max-w-[460px] aspect-[3/4] rounded-2xl overflow-hidden shadow-lg border-2 border-border-warm bg-black select-none touch-none mx-auto"
            >
              {/* Product Background Image */}
              <img
                src={activeImage}
                alt="Status Preview"
                className="w-full h-full object-contain pointer-events-none"
              />

              {/* Draggable WhatsApp Story Text Badges */}
              {textBoxes.map((box) => {
                const isSelected = box.id === selectedBoxId;
                const style = BG_STYLES[box.bg] || BG_STYLES.black;

                return (
                  <div
                    key={box.id}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleDragStart(box.id, e.clientX, e.clientY);
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      if (e.touches[0]) handleDragStart(box.id, e.touches[0].clientX, e.touches[0].clientY);
                    }}
                    style={{
                      left: `${box.xPercent}%`,
                      top: `${box.yPercent}%`,
                      transform: 'translate(-50%, -50%)',
                      backgroundColor: style.bg,
                      color: style.text,
                      fontSize: `clamp(12px, ${box.fontSize * 0.88}px, ${box.fontSize}px)`,
                    }}
                    className={`absolute z-20 cursor-grab active:cursor-grabbing font-bold text-center px-3 sm:px-4 py-1 sm:py-1.5 rounded-full max-w-[88%] whitespace-pre-line break-words shadow-xl transition-shadow leading-tight touch-none select-none ${
                      isSelected
                        ? 'ring-2 ring-gold ring-offset-2 ring-offset-black scale-[1.03]'
                        : 'hover:ring-1 hover:ring-white/60 active:scale-95'
                    }`}
                  >
                    <span>{box.text}</span>

                    {/* Touch-friendly remove button when selected */}
                    {isSelected && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSelectedBox();
                        }}
                        className="absolute -top-2.5 -right-2.5 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-700 transition-colors"
                        title="Delete badge"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}

              <div className="absolute bottom-2 left-2 pointer-events-none bg-black/60 backdrop-blur-xs text-white/90 text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1">
                <Move className="w-3 h-3" />
                <span>Drag badges to reposition</span>
              </div>
            </div>

            {/* Thumbnail switcher underneath photo */}
            {safeImages.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto max-w-[340px] sm:max-w-[420px] lg:max-w-[460px] py-2.5 mt-1 px-1 scrollbar-none">
                {safeImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImgIdx(i)}
                    className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${
                      activeImgIdx === i ? 'border-gold shadow-md scale-105' : 'border-border-warm opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Controls & Badges Settings (Right 5 Cols on desktop, Bottom on mobile) */}
          <div className="lg:col-span-5 space-y-4 sm:space-y-5 flex flex-col justify-between">
            <div className="space-y-4 sm:space-y-5">

              {/* Quick Presets (One-click add) */}
              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-border-warm shadow-xs space-y-2">
                <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-charcoal">
                  Quick Story Badges
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {price && (
                    <button
                      type="button"
                      onClick={() => addTextBox(`ek piece Rs.${price} free shipping`)}
                      className="px-2.5 py-1 text-xs font-semibold bg-ivory-dark hover:bg-gold/15 hover:text-gold border border-border-warm rounded-lg transition-colors text-charcoal active:scale-95"
                    >
                      + Rs.{price} free shipping
                    </button>
                  )}
                  {price && (
                    <button
                      type="button"
                      onClick={() => addTextBox(`Rs.${price}/- Only`)}
                      className="px-2.5 py-1 text-xs font-semibold bg-ivory-dark hover:bg-gold/15 hover:text-gold border border-border-warm rounded-lg transition-colors text-charcoal active:scale-95"
                    >
                      + Rs.{price}/- Only
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => addTextBox('36 inch')}
                    className="px-2.5 py-1 text-xs font-semibold bg-ivory-dark hover:bg-gold/15 hover:text-gold border border-border-warm rounded-lg transition-colors text-charcoal active:scale-95"
                  >
                    + 36 inch
                  </button>
                  <button
                    type="button"
                    onClick={() => addTextBox('Limited Stock')}
                    className="px-2.5 py-1 text-xs font-semibold bg-ivory-dark hover:bg-gold/15 hover:text-gold border border-border-warm rounded-lg transition-colors text-charcoal active:scale-95"
                  >
                    + Limited Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => addTextBox('Ready to Dispatch')}
                    className="px-2.5 py-1 text-xs font-semibold bg-ivory-dark hover:bg-gold/15 hover:text-gold border border-border-warm rounded-lg transition-colors text-charcoal active:scale-95"
                  >
                    + Ready to Dispatch
                  </button>
                  <button
                    type="button"
                    onClick={() => addTextBox('Original Opening Video Required')}
                    className="px-2.5 py-1 text-xs font-semibold bg-ivory-dark hover:bg-gold/15 hover:text-gold border border-border-warm rounded-lg transition-colors text-charcoal active:scale-95"
                  >
                    + Opening Video Required
                  </button>
                  <button
                    type="button"
                    onClick={() => addTextBox()}
                    className="px-2.5 py-1 text-xs font-semibold text-gold border border-gold/40 hover:bg-gold/10 rounded-lg transition-colors flex items-center gap-1 active:scale-95"
                  >
                    <Plus className="w-3 h-3" /> Custom Text
                  </button>
                </div>
              </div>

              {/* Selected Badge Editor */}
              {selectedBox ? (
                <div className="bg-white p-3.5 sm:p-4 rounded-2xl border-2 border-gold/40 shadow-xs space-y-3.5 sm:space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-1">
                      <span>Edit Selected Badge</span>
                    </p>
                    <button
                      type="button"
                      onClick={removeSelectedBox}
                      className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1 font-medium p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-charcoal-light block mb-1">
                      Badge Text (press Enter for multiple lines)
                    </label>
                    <textarea
                      rows={2}
                      value={selectedBox.text}
                      onChange={(e) => updateSelectedBox('text', e.target.value)}
                      className="w-full px-3 py-2 border border-border-warm rounded-xl text-xs text-charcoal focus:outline-none focus:border-gold font-medium bg-ivory-dark/30"
                      placeholder="e.g. ek piece Rs.1000 free shipping"
                    />
                  </div>

                  {/* Badge Pill Style */}
                  <div>
                    <label className="text-[11px] font-semibold text-charcoal-light block mb-1.5">
                      Pill Background Style
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                      {(Object.keys(BG_STYLES) as TextBox['bg'][]).map((key) => {
                        const isCur = selectedBox.bg === key;
                        const conf = BG_STYLES[key];
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => updateSelectedBox('bg', key)}
                            className={`px-2 py-1.5 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-all ${
                              isCur
                                ? 'border-gold bg-gold/10 font-bold text-charcoal shadow-xs'
                                : 'border-border-warm hover:border-gold/50 text-charcoal-light'
                            }`}
                          >
                            <span
                              className="w-3 h-3 rounded-full border border-black/20 flex-shrink-0"
                              style={{ backgroundColor: conf.bg === 'transparent' ? '#ccc' : conf.bg }}
                            />
                            <span className="truncate">{conf.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Size slider */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-charcoal-light mb-1">
                      <span>Font Size</span>
                      <span className="font-mono">{selectedBox.fontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="14"
                      max="38"
                      value={selectedBox.fontSize}
                      onChange={(e) => updateSelectedBox('fontSize', Number(e.target.value))}
                      className="w-full accent-gold cursor-pointer"
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-dashed border-border-warm text-center text-xs text-charcoal-light">
                  Tap any badge on the photo to edit text, size, or style.
                </div>
              )}
            </div>

            {/* Action / Download Buttons */}
            <div className="pt-2 space-y-2">
              {canShare ? (
                <>
                  <button
                    type="button"
                    onClick={handleShareStatus}
                    disabled={isExporting}
                    className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all shadow-md disabled:opacity-50 active:scale-[0.98]"
                  >
                    {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                    <span>Post directly to WhatsApp / Share</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadCurrent}
                    disabled={isExporting}
                    className="w-full flex items-center justify-center gap-2 bg-charcoal hover:bg-charcoal/90 text-white font-medium py-2.5 px-4 rounded-xl text-xs transition-all shadow-xs disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Image File</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleDownloadCurrent}
                  disabled={isExporting}
                  className="w-full flex items-center justify-center gap-2 bg-charcoal hover:bg-charcoal/90 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all shadow-md disabled:opacity-50 active:scale-[0.98]"
                >
                  {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  <span>Download Current Image for Status</span>
                </button>
              )}

              {safeImages.length > 1 && (
                <button
                  type="button"
                  onClick={handleDownloadAll}
                  disabled={isExporting}
                  className="w-full flex items-center justify-center gap-2 bg-ivory-dark hover:bg-gold/15 text-charcoal hover:text-gold border border-border-warm font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors disabled:opacity-50 active:scale-[0.98]"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Download All {safeImages.length} Status Photos</span>
                </button>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
