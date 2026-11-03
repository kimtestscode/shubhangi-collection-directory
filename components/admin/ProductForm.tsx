'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Product, ProductInsert, InlineVariant, OptionType } from '@/lib/types';
import { slugify } from '@/lib/utils';
import StatusPhotoEditorModal from './StatusPhotoEditorModal';
import {
  Loader2, Plus, X, Wand2, Trash2, Sparkles,
  ImagePlus, QrCode, MapPin, Mic, MicOff, Check, Zap
} from 'lucide-react';
import { useLanguage } from '@/lib/languageContext';

interface Props {
  product?: Product;
  mode: 'create' | 'edit';
}

export const CATEGORY_LIST = [
  'Necklaces',
  'Earrings',
  'Rings',
  'Bracelets',
  'Combo Sets',
  'Kids',
  'Bangles',
  'Kada',
  'Chain',
  'Choker',
  'Long Necklace',
  'Mangalsutra',
  'Pooja Bhandar',
  'Rani Haar',
  'Short Mangalsutra',
  'Mala',
  'Thushi',
  'Bugdi',
  'Nath',
  'Ear Cuff',
  'Ear Chain',
  'Jhumka',
  'Chinchpeti',
  'Payal/Anklets',
  'Kamarpatta',
  'Hair Accessories',
  'Bajuband/Armlets',
];

export const SUBCATEGORIES = [
  'American Diamond',
  'Copper',
  'Geru',
  'Micro-Gold',
  'Victorian',
  'Moti (Pearl)',
  'Silver',
  'German Silver Polish',
];

export const JEWELRY_TYPES = [
  'Imitation',
  'Real',
  'Semi-Precious',
  'Fashion',
  'Antique',
  'Temple',
  '1 Gram Gold Formed',
];

export const VENDOR_OPTIONS = [
  'No vendor',
  'Direct Workshop / In-House',
  'Rajkot Artisan',
  'Surat Manufacturer',
  'Jaipur Polki Vendor',
  'Mumbai Zaveri Bazaar',
  'Custom / Other',
];

export const CATEGORY_PREFIX_MAP: Record<string, string> = {
  necklaces: 'NCK',
  choker: 'CHK',
  'long necklace': 'LNK',
  earrings: 'EAR',
  jhumka: 'JHM',
  bugdi: 'BGD',
  'ear cuff': 'ECF',
  'ear chain': 'ECH',
  rings: 'RNG',
  bracelets: 'BRC',
  bangles: 'BNG',
  kada: 'KAD',
  'combo sets': 'SET',
  mangalsutra: 'MGL',
  'short mangalsutra': 'SMG',
  'rani haar': 'RNH',
  nath: 'NTH',
  'payal/anklets': 'ANK',
  kamarpatta: 'KMR',
  'hair accessories': 'HAR',
  'bajuband/armlets': 'BJB',
  'pooja bhandar': 'PJA',
  thushi: 'THS',
  mala: 'MLA',
  chain: 'CHN',
  kids: 'KID',
};

export const CATEGORY_BARCODE_CODE: Record<string, string> = {
  necklaces: '01',
  earrings: '02',
  rings: '03',
  bracelets: '04',
  'combo sets': '05',
  kids: '06',
  bangles: '07',
  kada: '08',
  chain: '09',
  choker: '10',
  'long necklace': '11',
  mangalsutra: '12',
  'pooja bhandar': '13',
  'rani haar': '14',
  'short mangalsutra': '15',
  mala: '16',
  thushi: '17',
  bugdi: '18',
  nath: '19',
  'ear cuff': '20',
  'ear chain': '21',
  jhumka: '22',
  chinchpeti: '23',
  'payal/anklets': '24',
  kamarpatta: '25',
  'hair accessories': '26',
  'bajuband/armlets': '27',
};

// Generates a deterministic 7-digit numeric hash from normalized product name
export function getNameNumericHash(name: string): string {
  const clean = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!clean) return '1000001';
  let hash = 5381;
  for (let i = 0; i < clean.length; i++) {
    hash = ((hash << 5) + hash) + clean.charCodeAt(i);
    hash = hash & 0x7fffffff;
  }
  return String(hash % 10000000).padStart(7, '0');
}

// Compute standard EAN-13 modulo 10 checksum
export function computeEAN13Checksum(first12: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(first12[i], 10) || 0;
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  return (10 - (sum % 10)) % 10;
}

// Generate Barcode directly based on Category and Name
export function generateBarcodeFromCategoryAndName(categoryName: string, name: string): string {
  const catKey = (categoryName || '').toLowerCase().trim();
  const catCode = CATEGORY_BARCODE_CODE[catKey] || '99';
  const nameHash = getNameNumericHash(name);
  const first12 = `890${catCode}${nameHash}`;
  const checkDigit = computeEAN13Checksum(first12);
  return `${first12}${checkDigit}`;
}

// Generate SKU directly based on Category and Name
export function generateSkuFromCategoryAndName(categoryName: string, name: string): string {
  const catKey = (categoryName || '').toLowerCase().trim();
  const prefix = CATEGORY_PREFIX_MAP[catKey] || catKey.slice(0, 3).toUpperCase() || 'SC';

  let namePart = '';
  if (name && name.trim()) {
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      namePart = words.map(w => w[0]?.toUpperCase()).slice(0, 3).join('');
    } else {
      namePart = words[0].slice(0, 3).toUpperCase();
    }
  } else {
    namePart = 'ITM';
  }

  const nameHash = getNameNumericHash(name);
  const suffix = nameHash.slice(-4);
  return `${prefix}-${namePart}-${suffix}`;
}

async function uploadSingleFile(file: File): Promise<string | null> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  const data = await res.json();
  return data.url || null;
}

interface VariantOptionTypeInput {
  name: string;
  valuesText: string;
}

interface FormVariantRow {
  _key: string;
  id?: string;
  name: string;
  option_values: Record<string, string>;
  sku: string;
  barcode: string;
  price_override: number | null;
  stock: number;
  images: string[];
  is_active: boolean;
  _uploading?: boolean;
}

function generateVariantCombinations(
  optionTypes: { name: string; values: string[] }[]
): Record<string, string>[] {
  return optionTypes.reduce<Record<string, string>[]>((acc, opt) => {
    if (opt.values.length === 0) return acc;
    if (acc.length === 0) return opt.values.map(v => ({ [opt.name]: v }));
    const next: Record<string, string>[] = [];
    for (const combo of acc) {
      for (const v of opt.values) next.push({ ...combo, [opt.name]: v });
    }
    return next;
  }, []);
}

function variantLabel(optionValues: Record<string, string>): string {
  const vals = Object.values(optionValues);
  return vals.length > 0 ? vals.join(' – ') : 'Default';
}

function optionValuesEqual(a: Record<string, string>, b: Record<string, string>): boolean {
  const aKeys = Object.keys(a), bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every(k => a[k] === b[k]);
}

export default function ProductForm({ product, mode }: Props) {
  const router = useRouter();
  const { lang } = useLanguage();
  const isMr = lang === 'mr';

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Voice Assist & Gemini AI Dictation
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [voiceNotice, setVoiceNotice] = useState('');
  const [aiParsing, setAiParsing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');

  // Form Fields
  const [productName, setProductName] = useState(product?.name || '');
  const [categories, setCategories] = useState<string[]>(() => {
    if (product?.categories && Array.isArray(product.categories) && product.categories.length > 0) {
      return product.categories;
    }
    if (product?.category) {
      return [product.category];
    }
    return ['Necklaces'];
  });
  const [subcategories, setSubcategories] = useState<string[]>(product?.subcategories || []);
  const [jewelryType, setJewelryType] = useState(product?.jewelry_type || 'Imitation');

  // SKU & Barcode
  const [sku, setSku] = useState(product?.sku || '');
  const [barcode, setBarcode] = useState(product?.barcode || '');

  // Pricing & Stock
  const [price, setPrice] = useState(product?.price != null ? String(product.price) : '');
  const [originalPrice, setOriginalPrice] = useState(product?.regular_price != null ? String(product.regular_price) : '');
  const [stockQuantity, setStockQuantity] = useState(product?.stock_quantity != null ? String(product.stock_quantity) : '1');

  // Price Includes Shipping toggle
  const [priceIncludesShipping, setPriceIncludesShipping] = useState(product?.price_includes_shipping ?? false);

  // Storage Location
  const [rackNumber, setRackNumber] = useState(product?.rack_number || '');
  const [boxNumber, setBoxNumber] = useState(product?.box_number || '');
  const [slotNumber, setSlotNumber] = useState(product?.slot_number || '');

  // Vendor
  const [vendorId, setVendorId] = useState(product?.vendor_id || '');

  // Publishing & Badges
  const [isPublished, setIsPublished] = useState(product ? product.availability !== 'hidden' : true);
  const [isNewArrival, setIsNewArrival] = useState(product?.is_new_arrival ?? false);
  const [isBestSeller, setIsBestSeller] = useState(product?.is_best_seller ?? product?.featured ?? false);

  // Images
  const [images, setImages] = useState<string[]>(product?.images || []);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Size chart
  const [sizeChartUrl, setSizeChartUrl] = useState(product?.size_chart_url || '');
  const [uploadingSizeChart, setUploadingSizeChart] = useState(false);

  // Description
  const [description, setDescription] = useState(product?.description || '');

  // Variants state
  const [hasVariants, setHasVariants] = useState(Boolean(product?.has_variants));
  const [variantOptionTypes, setVariantOptionTypes] = useState<VariantOptionTypeInput[]>(() => {
    if (product?.option_types && product.option_types.length > 0) {
      return product.option_types.map(o => ({
        name: o.name || (o as any).type || '',
        valuesText: o.values.join(', '),
      }));
    }
    return [{ name: 'Size', valuesText: '' }];
  });

  const [variantRows, setVariantRows] = useState<FormVariantRow[]>(() => {
    if (product?.variants && product.variants.length > 0) {
      return product.variants.map((v, i) => {
        const optionValues = v.option_values || (v.name ? { Option: v.name } : {});
        const imgs = Array.isArray(v.images) && v.images.length > 0
          ? v.images
          : v.image ? [v.image] : [];
        return {
          _key: v.id || `var-${i}-${Date.now()}`,
          id: v.id,
          name: v.name || variantLabel(optionValues),
          option_values: optionValues,
          sku: v.sku || '',
          barcode: v.barcode || '',
          price_override: v.price_override ?? null,
          stock: v.stock ?? 0,
          images: imgs,
          is_active: v.is_active ?? true,
        };
      });
    }
    return [];
  });

  // WhatsApp Status Photo Editor Modal
  const [isStatusEditorOpen, setIsStatusEditorOpen] = useState(false);

  const allStatusImages = useMemo(() => {
    const mainImages = images || [];
    const variantImgs = variantRows.flatMap(v => Array.isArray(v.images) ? v.images : []);
    const initialImgs = product?.images || [];
    return Array.from(new Set([...mainImages, ...initialImgs, ...variantImgs])).filter(Boolean);
  }, [images, variantRows, product?.images]);

  // Voice Assist setup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setVoiceSupported(false);
      }
    }
  }, []);

  const startListening = () => {
    setVoiceNotice('');
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      finalTranscriptRef.current = voiceTranscript ? voiceTranscript.trim() + ' ' : '';

      recognition.onstart = () => setIsListening(true);

      // Eliminates word echoing/duplication by accumulating finalized segments + current interim
      recognition.onresult = (event: any) => {
        let currentSessionFinal = '';
        let currentSessionInterim = '';

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            currentSessionFinal += res[0].transcript + ' ';
          } else {
            currentSessionInterim += res[0].transcript;
          }
        }

        const full = (finalTranscriptRef.current + currentSessionFinal + currentSessionInterim).trim();
        setVoiceTranscript(full);
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          setVoiceNotice(`Speech notice: ${event.error || 'Paused'}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      setVoiceNotice(`Could not start speech recognition: ${e.message}`);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  // ── Gemini AI Dictation & Product Field Parsing ──
  const handleParseWithGemini = async () => {
    const textToAnalyze = voiceTranscript.trim() || productName.trim();
    if (!textToAnalyze) {
      setError(isMr ? 'कृपया आधी व्हॉइसने बोला किंवा उत्पादनाचा मजकूर टाइप करा.' : 'Please speak or enter some product details into Voice Assist first.');
      return;
    }

    setAiParsing(true);
    setError('');
    setVoiceNotice('');

    try {
      const res = await fetch('/api/ai/parse-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToAnalyze }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to parse with Gemini AI');
      }

      const d = json.data;
      if (d.name) setProductName(d.name);
      if (Array.isArray(d.categories) && d.categories.length > 0) {
        setCategories(d.categories);
      }
      if (Array.isArray(d.subcategories) && d.subcategories.length > 0) {
        setSubcategories(d.subcategories);
      }
      if (d.jewelry_type) setJewelryType(d.jewelry_type);
      if (d.price != null && !isNaN(Number(d.price))) setPrice(String(d.price));
      if (d.original_price != null && !isNaN(Number(d.original_price))) setOriginalPrice(String(d.original_price));
      if (d.stock_quantity != null && !isNaN(Number(d.stock_quantity))) setStockQuantity(String(d.stock_quantity));
      if (d.price_includes_shipping != null) setPriceIncludesShipping(Boolean(d.price_includes_shipping));
      if (d.rack_number) setRackNumber(d.rack_number);
      if (d.box_number) setBoxNumber(d.box_number);
      if (d.slot_number) setSlotNumber(d.slot_number);
      if (d.description) setDescription(d.description);

      // Auto-generate Barcode & SKU directly based on the detected Category and Name
      const targetCat = (Array.isArray(d.categories) && d.categories[0]) || categories[0] || 'Necklaces';
      const targetName = d.name || productName || textToAnalyze;
      const newSku = generateSkuFromCategoryAndName(targetCat, targetName);
      const newBarcode = generateBarcodeFromCategoryAndName(targetCat, targetName);
      setSku(newSku);
      setBarcode(newBarcode);

      setSuccessMsg(
        isMr
          ? `Gemini AI ने सर्व माहिती भरली! SKU: ${newSku}, बारकोड: ${newBarcode}`
          : `Gemini AI auto-filled product fields & generated SKU (${newSku}) and Barcode (${newBarcode})!`
      );
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err: any) {
      setError(err.message || 'Error parsing with Gemini API');
    } finally {
      setAiParsing(false);
    }
  };

  // Local heuristic fallback parser
  const parseWithLocalFallback = () => {
    if (!voiceTranscript) return;
    const text = voiceTranscript.toLowerCase();

    const priceMatch = text.match(/(?:price|rate|cost|rupees|rs\.?)\s*(?:is\s*)?(\d+)/i) || text.match(/(\d+)\s*(?:rupees|rs)/i);
    if (priceMatch && priceMatch[1]) setPrice(priceMatch[1]);

    const stockMatch = text.match(/(?:stock|quantity|qty|pieces|pcs)\s*(?:is\s*)?(\d+)/i);
    if (stockMatch && stockMatch[1]) setStockQuantity(stockMatch[1]);

    for (const cat of CATEGORY_LIST) {
      if (text.includes(cat.toLowerCase())) {
        if (!categories.includes(cat)) setCategories(prev => [...prev, cat]);
        break;
      }
    }

    for (const sub of SUBCATEGORIES) {
      if (text.includes(sub.toLowerCase())) {
        if (!subcategories.includes(sub)) setSubcategories(prev => [...prev, sub]);
      }
    }

    if (!productName) {
      const cleaned = voiceTranscript
        .replace(/(?:price|rate|cost|rupees|rs\.?)\s*(?:is\s*)?\d+/gi, '')
        .replace(/(?:stock|quantity|qty|pieces|pcs)\s*(?:is\s*)?\d+/gi, '')
        .trim();
      if (cleaned.length > 2) {
        setProductName(cleaned.charAt(0).toUpperCase() + cleaned.slice(1));
      }
    }

    setVoiceNotice(isMr ? 'माहिती भरली गेली!' : 'Extracted basic fields!');
  };

  // ── Auto-generate SKU based on Category and Name ──
  const handleAutoSKU = () => {
    const primaryCat = categories[0] || 'Necklaces';
    const name = productName.trim();
    if (!name) {
      setError(isMr ? 'कृपया SKU तयार करण्यासाठी आधी उत्पादनाचे नाव प्रविष्ट करा.' : 'Please enter product name first to generate SKU.');
      return;
    }
    const generated = generateSkuFromCategoryAndName(primaryCat, name);
    setSku(generated);
    setSuccessMsg(isMr ? `SKU तयार झाला: ${generated}` : `Generated SKU based on ${primaryCat} & Name: ${generated}`);
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  // ── Auto-generate Barcode based on Category and Name ──
  const handleAutoBarcode = () => {
    const primaryCat = categories[0] || 'Necklaces';
    const name = productName.trim();
    if (!name) {
      setError(isMr ? 'कृपया बारकोड तयार करण्यासाठी आधी उत्पादनाचे नाव प्रविष्ट करा.' : 'Please enter product name first to generate Barcode.');
      return;
    }
    const generated = generateBarcodeFromCategoryAndName(primaryCat, name);
    setBarcode(generated);
    setSuccessMsg(isMr ? `बारकोड तयार झाला: ${generated}` : `Generated Barcode based on ${primaryCat} & Name: ${generated}`);
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  // ── Auto-generate BOTH SKU & Barcode at once ──
  const handleAutoBoth = () => {
    const primaryCat = categories[0] || 'Necklaces';
    const name = productName.trim();
    if (!name) {
      setError(isMr ? 'कृपया आधी नाव आणि कॅटेगरी निश्चित करा.' : 'Please enter product name first.');
      return;
    }
    const s = generateSkuFromCategoryAndName(primaryCat, name);
    const b = generateBarcodeFromCategoryAndName(primaryCat, name);
    setSku(s);
    setBarcode(b);
    setSuccessMsg(
      isMr
        ? `SKU (${s}) आणि बारकोड (${b}) कॅटेगरी व नावावरून तयार झाले!`
        : `Generated both SKU (${s}) & Barcode (${b}) from Category (${primaryCat}) & Name!`
    );
    setTimeout(() => setSuccessMsg(''), 4500);
  };

  // Image Upload Handlers
  const handleImageFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingImage(true);
    setError('');

    const newUrls: string[] = [];
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        setError(`File ${file.name} exceeds 5MB limit.`);
        continue;
      }
      const url = await uploadSingleFile(file);
      if (url) newUrls.push(url);
    }

    setImages(prev => [...prev, ...newUrls]);
    setUploadingImage(false);
    e.target.value = '';
  };

  const addImageUrls = () => {
    if (!imageUrlInput.trim()) return;
    const urls = imageUrlInput
      .split(/[|,]/)
      .map(u => u.trim())
      .filter(u => u.startsWith('http://') || u.startsWith('https://'));
    if (urls.length > 0) {
      setImages(prev => [...prev, ...urls]);
      setImageUrlInput('');
    }
  };

  const removeImage = (url: string) => {
    setImages(prev => prev.filter(u => u !== url));
  };

  // Size chart upload
  const handleSizeChartUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSizeChart(true);
    const url = await uploadSingleFile(file);
    if (url) setSizeChartUrl(url);
    setUploadingSizeChart(false);
    e.target.value = '';
  };

  // Variant Option Types
  const addOptionType = () => setVariantOptionTypes(prev => [...prev, { name: '', valuesText: '' }]);
  const removeOptionType = (i: number) => setVariantOptionTypes(prev => prev.filter((_, idx) => idx !== i));
  const updateOptionType = (i: number, field: 'name' | 'valuesText', val: string) => {
    setVariantOptionTypes(prev => prev.map((o, idx) => idx === i ? { ...o, [field]: val } : o));
  };

  // Generate Variants
  const regenerateVariantRows = () => {
    const optionTypes = variantOptionTypes
      .map(t => ({
        name: t.name.trim(),
        values: t.valuesText.split(',').map(v => v.trim()).filter(Boolean),
      }))
      .filter(t => t.name && t.values.length > 0);

    if (optionTypes.length === 0) return;

    const combos = generateVariantCombinations(optionTypes);
    const baseSku = (sku || 'VAR').toUpperCase();

    setVariantRows(prev => combos.map(combo => {
      const existing = prev.find(r => optionValuesEqual(r.option_values, combo));
      if (existing) return existing;

      const skuSuffix = Object.values(combo)
        .map(v => v.replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase())
        .join('-');

      return {
        _key: `new-${Object.values(combo).join('-')}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: variantLabel(combo),
        option_values: combo,
        sku: baseSku ? `${baseSku}-${skuSuffix}` : '',
        barcode: '',
        price_override: null,
        stock: 0,
        images: [],
        is_active: true,
      };
    }));
  };

  const updateVariantRow = <K extends keyof FormVariantRow>(key: string, field: K, val: FormVariantRow[K]) => {
    setVariantRows(prev => prev.map(r => r._key === key ? { ...r, [field]: val } : r));
  };

  const removeVariantRow = (key: string) => {
    setVariantRows(prev => prev.filter(r => r._key !== key));
  };

  const handleVariantRowImageUpload = async (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVariantRows(prev => prev.map(r => r._key === key ? { ...r, _uploading: true } : r));
    const url = await uploadSingleFile(file);

    setVariantRows(prev => {
      return prev.map(r => {
        if (r._key !== key) return r;
        const updatedImages = url ? [...r.images, url].slice(0, 3) : r.images;
        return {
          ...r,
          images: updatedImages,
          _uploading: false,
        };
      });
    });
    e.target.value = '';
  };

  const removeVariantRowImage = (key: string, url: string) => {
    setVariantRows(prev => prev.map(r => r._key === key ? { ...r, images: r.images.filter(i => i !== url) } : r));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!productName.trim()) {
      setError(isMr ? 'कृपया उत्पादनाचे नाव भरा.' : 'Please provide a product name.');
      return;
    }
    if (!price || isNaN(Number(price))) {
      setError(isMr ? 'कृपया योग्य विक्री किंमत भरा.' : 'Please enter a valid selling price.');
      return;
    }

    setSaving(true);

    const cleanedOptionTypes: OptionType[] = hasVariants
      ? variantOptionTypes
          .filter(o => o.name.trim() && o.valuesText.trim())
          .map(o => ({
            name: o.name.trim(),
            values: o.valuesText.split(',').map(v => v.trim()).filter(Boolean),
          }))
      : [];

    const cleanedVariants: InlineVariant[] = hasVariants
      ? variantRows.map(r => ({
          name: r.name,
          option_values: r.option_values,
          sku: r.sku,
          barcode: r.barcode,
          price_override: r.price_override != null && !isNaN(r.price_override) ? Number(r.price_override) : null,
          stock: Number(r.stock) || 0,
          images: r.images,
          image: r.images[0] || '',
          is_active: r.is_active,
        }))
      : [];

    const primaryCategory = categories[0] || 'Necklaces';
    const computedSlug = product?.slug || slugify(productName) || `prod-${Date.now()}`;

    // Ensure SKU & Barcode are derived if empty
    const finalSku = sku.trim() || generateSkuFromCategoryAndName(primaryCategory, productName.trim());
    const finalBarcode = barcode.trim() || generateBarcodeFromCategoryAndName(primaryCategory, productName.trim());

    const payload: Partial<ProductInsert> = {
      sku: finalSku,
      name: productName.trim(),
      slug: computedSlug,
      category: primaryCategory,
      categories: categories,
      subcategories: subcategories,
      jewelry_type: jewelryType,
      barcode: finalBarcode,
      price: Number(price),
      regular_price: originalPrice.trim() !== '' ? Number(originalPrice) : null,
      stock_quantity: Number(stockQuantity) || 0,
      price_includes_shipping: priceIncludesShipping,
      rack_number: rackNumber.trim() || null,
      box_number: boxNumber.trim() || null,
      slot_number: slotNumber.trim() || null,
      vendor_id: vendorId.trim() || null,
      availability: isPublished ? 'available' : 'hidden',
      featured: isBestSeller,
      is_new_arrival: isNewArrival,
      is_best_seller: isBestSeller,
      size_chart_url: sizeChartUrl || null,
      description: description.trim() || null,
      images: images,
      thumbnail: images[0] || null,
      currency: 'INR',
      product_type: hasVariants ? 'variable' : 'simple',
      has_variants: hasVariants,
      option_types: hasVariants ? cleanedOptionTypes : null,
      variants: hasVariants ? cleanedVariants : null,
      parent_sku: null,
      color: null,
      variant_type: null,
    };

    try {
      const res = mode === 'create'
        ? await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/products/${product!.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      if (res.ok) {
        router.push('/admin');
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save product.');
        setSaving(false);
      }
    } catch (err: any) {
      setError(err.message || 'Network error occurred while saving.');
      setSaving(false);
    }
  };

  const inputCls = "w-full px-3.5 py-2.5 bg-white border border-border-warm rounded-xl text-charcoal placeholder-charcoal-light/40 text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition-all font-medium";
  const labelCls = "text-xs font-semibold uppercase tracking-wider text-charcoal-light block mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-border-warm rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 text-charcoal">

      {/* ── 1. Voice Assist & Gemini AI Dictation Card ── */}
      <div className="border border-gold/40 rounded-2xl p-4 sm:p-5 bg-ivory/60 transition-all shadow-xs">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold" />
            <span className="text-charcoal font-semibold text-sm">
              {isMr ? 'व्हॉइस असिस्ट व जेमिनी AI डिक्टेशन' : 'Voice Assist & Gemini AI Dictation'}
            </span>
            <span className="bg-gold/15 text-charcoal border border-gold/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
              Gemini AI
            </span>
          </div>
          {!voiceSupported && (
            <span className="text-charcoal-light text-xs">
              {isMr ? 'या ब्राउझरमध्ये व्हॉइस सपोर्ट नाही (Chrome किंवा Edge वापरा)' : 'Voice not supported in this browser — type into box below for Gemini'}
            </span>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2.5 mb-3 flex-wrap">
            {voiceSupported && (
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all shadow-xs ${
                  isListening
                    ? 'bg-red-50 text-red-600 border border-red-300 animate-pulse'
                    : 'bg-white border border-gold text-charcoal hover:bg-gold hover:text-white'
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-3.5 h-3.5" />
                    <span>{isMr ? 'थांबवा' : 'Stop Listening'}</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5 text-gold" />
                    <span>{isMr ? 'बोलणे सुरू करा' : 'Start Speaking'}</span>
                  </>
                )}
              </button>
            )}

            {isListening && (
              <span className="flex items-center gap-1.5 text-red-600 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                {isMr ? 'ऐकत आहे...' : 'Listening...'}
              </span>
            )}

            {/* Primary Gemini AI Parse Button */}
            <button
              type="button"
              onClick={handleParseWithGemini}
              disabled={aiParsing || (!voiceTranscript && !productName)}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-gold to-gold-light/90 hover:from-gold/90 hover:to-gold text-charcoal font-bold rounded-xl text-xs shadow-sm transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
              title="Send speech or description to Gemini AI to extract fields, SKU, and Barcode"
            >
              {aiParsing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-charcoal" />
                  <span>{isMr ? 'जेमिनी विश्लेषण करत आहे...' : 'Gemini AI Analyzing...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-charcoal" />
                  <span>{isMr ? 'जेमिनी AI ने सर्व भरा' : 'Parse & Auto-Fill with Gemini AI'}</span>
                </>
              )}
            </button>

            {voiceTranscript && !isListening && (
              <button
                type="button"
                onClick={parseWithLocalFallback}
                className="text-charcoal-light hover:text-gold text-xs underline font-medium"
                title="Quick local keyword extraction"
              >
                {isMr ? 'साधे भरणे' : 'Quick Local Fill'}
              </button>
            )}

            {voiceTranscript && (
              <button
                type="button"
                onClick={() => { setVoiceTranscript(''); setVoiceNotice(''); }}
                className="text-charcoal-light hover:text-red-600 text-xs underline ml-auto transition-colors"
              >
                {isMr ? 'रद्द करा' : 'Clear Dictation'}
              </button>
            )}
          </div>

          <textarea
            value={voiceTranscript}
            onChange={e => setVoiceTranscript(e.target.value)}
            rows={2}
            className="w-full px-3.5 py-2.5 bg-white border border-border-warm rounded-xl text-charcoal text-xs focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 resize-none font-sans"
            placeholder={
              isMr
                ? 'उदा. "रॉयल कुंदन चोकर नेकलेस सेट कॉपर फिनिशमध्ये, किंमत १८५०, एमआरपी २५००, स्टॉक ५, रॅक A1 बॉक्स B2"'
                : 'Speak or type product details e.g. "Royal Kundan choker necklace set in copper finish, price 1850, MRP 2500, stock 5, rack A1 box B2" — then click "Parse & Auto-Fill with Gemini AI"'
            }
          />

          {voiceNotice && (
            <p className="text-gold text-xs mt-1.5 flex items-center gap-1 font-medium">
              <Check className="w-3.5 h-3.5 text-gold" /> {voiceNotice}
            </p>
          )}
        </div>
      </div>

      {/* ── 2. Product Name ── */}
      <div>
        <label className={labelCls}>
          {isMr ? 'उत्पादनाचे नाव *' : 'Product Name *'}
        </label>
        <input
          type="text"
          required
          value={productName}
          onChange={e => setProductName(e.target.value)}
          placeholder="e.g. Ashtapallu 3 Layer Necklace"
          className={inputCls}
        />
      </div>

      {/* ── 3. Category & Subcategory / Finish ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Category (select all that apply) */}
        <div>
          <label className={labelCls}>
            {isMr ? 'कॅटेगरी (लागू असलेल्या निवडा)' : 'Category (select all that apply)'}
          </label>
          <div className="flex flex-col gap-1 px-3 py-2.5 bg-ivory/40 border border-border-warm rounded-xl max-h-48 overflow-y-auto overscroll-contain">
            {CATEGORY_LIST.map(c => {
              const checked = categories.includes(c);
              return (
                <label key={c} className="flex items-center gap-2 text-charcoal text-xs py-1 hover:text-gold cursor-pointer select-none transition-colors">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={e => {
                      if (e.target.checked) {
                        setCategories(prev => [...prev, c]);
                      } else {
                        setCategories(prev => prev.filter(x => x !== c));
                      }
                    }}
                    className="w-4 h-4 rounded accent-gold cursor-pointer border-border-warm"
                  />
                  <span className={checked ? 'font-semibold text-charcoal' : 'text-charcoal-light'}>{c}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Subcategory / Finish (select all that apply) */}
        <div>
          <label className={labelCls}>
            {isMr ? 'सब-कॅटेगरी / फिनिश (लागू असलेल्या निवडा)' : 'Subcategory / Finish (select all that apply)'}
          </label>
          <div className="flex flex-col gap-1 px-3 py-2.5 bg-ivory/40 border border-border-warm rounded-xl max-h-48 overflow-y-auto overscroll-contain">
            {Array.from(new Set([...SUBCATEGORIES, ...subcategories])).map(s => {
              const checked = subcategories.includes(s);
              return (
                <label key={s} className="flex items-center gap-2 text-charcoal text-xs py-1 hover:text-gold cursor-pointer select-none transition-colors">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={e => {
                      if (e.target.checked) {
                        setSubcategories(prev => [...prev, s]);
                      } else {
                        setSubcategories(prev => prev.filter(x => x !== s));
                      }
                    }}
                    className="w-4 h-4 rounded accent-gold cursor-pointer border-border-warm"
                  />
                  <span className={checked ? 'font-semibold text-charcoal' : 'text-charcoal-light'}>{s}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 4. Jewelry Type (Age Group omitted as requested) ── */}
      <div>
        <label className={labelCls}>
          {isMr ? 'दागिना प्रकार (Jewelry Type)' : 'Jewelry Type'}
        </label>
        <select
          value={jewelryType}
          onChange={e => setJewelryType(e.target.value)}
          className={inputCls}
        >
          {JEWELRY_TYPES.map(t => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* ── 5. SKU & Barcode with Name/Category Auto buttons ── */}
      <div className="space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* SKU */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-light">
                {isMr ? 'SKU / उत्पादन कोड' : 'SKU'}
              </label>
              <span className="text-[10px] text-charcoal-light/70 font-mono">
                Prefix: {CATEGORY_PREFIX_MAP[(categories[0] || '').toLowerCase()] || 'SC'}
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={sku}
                onChange={e => setSku(e.target.value.toUpperCase())}
                placeholder="e.g. NCK-A18-5201"
                className={`${inputCls} font-mono uppercase`}
              />
              <button
                type="button"
                onClick={handleAutoSKU}
                className="px-4 py-2.5 bg-ivory border border-gold/40 text-charcoal hover:bg-gold/15 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 shadow-xs"
                title="Auto-generate SKU derived from Category & Name"
              >
                Auto
              </button>
            </div>
          </div>

          {/* Barcode */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-light">
                {isMr ? 'बारकोड (Barcode EAN-13)' : 'Barcode (EAN-13)'}
              </label>
              <span className="text-[10px] text-charcoal-light/70 font-mono">
                Cat Code: {CATEGORY_BARCODE_CODE[(categories[0] || '').toLowerCase()] || '99'}
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={barcode}
                onChange={e => setBarcode(e.target.value)}
                placeholder="e.g. 8900112345678"
                className={`${inputCls} font-mono`}
              />
              <button
                type="button"
                onClick={handleAutoBarcode}
                className="px-4 py-2.5 bg-ivory border border-gold/40 text-charcoal hover:bg-gold/15 rounded-xl text-xs font-bold transition-all flex items-center justify-center shrink-0 active:scale-95 shadow-xs"
                title="Auto-generate 13-digit EAN Barcode derived from Category & Name"
              >
                <QrCode className="w-4 h-4 text-gold" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick button to generate both SKU & Barcode at once */}
        <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
          <p className="text-[11px] text-charcoal-light">
            {isMr
              ? '💡 SKU आणि बारकोड दोन्ही निवडलेल्या कॅटेगरी आणि नावावरून थेट तयार होतात.'
              : '💡 Both SKU and Barcode are mathematically derived from your selected Category and Product Name.'}
          </p>
          <button
            type="button"
            onClick={handleAutoBoth}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-ivory border border-gold/50 text-charcoal hover:bg-gold/20 rounded-lg text-xs font-semibold transition-all shadow-xs"
            title="Generate both SKU and Barcode from current Category and Name"
          >
            <Zap className="w-3 h-3 text-gold" />
            <span>{isMr ? 'दोन्ही एकत्र तयार करा (SKU + बारकोड)' : 'Auto-Generate Both (SKU & Barcode)'}</span>
          </button>
        </div>
      </div>

      {/* ── 6. Pricing & Stock (3 Columns) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>
            {isMr ? 'किंमत (₹) *' : 'Price (₹) *'}
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            required
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="1100"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>
            {isMr ? 'मूळ किंमत / MRP (₹)' : 'Original Price (₹)'}
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={originalPrice}
            onChange={e => setOriginalPrice(e.target.value)}
            placeholder="1500"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>
            {isMr ? 'शिल्लक स्टॉक (Stock Qty)' : 'Stock Qty'}
          </label>
          <input
            type="number"
            min="0"
            value={stockQuantity}
            onChange={e => setStockQuantity(e.target.value)}
            placeholder="3"
            className={inputCls}
          />
        </div>
      </div>

      {/* ── 7. Price Includes Shipping Toggle ── */}
      <div className="flex items-center justify-between p-4 bg-ivory/40 border border-border-warm rounded-xl">
        <div className="pr-4">
          <p className="text-charcoal text-sm font-semibold">
            {isMr ? 'किंमतीत शिपिंग समाविष्ट आहे (Price Includes Shipping)' : 'Price Includes Shipping'}
          </p>
          <p className="text-charcoal-light text-xs mt-0.5 leading-relaxed">
            {priceIncludesShipping
              ? 'ON — this price already has shipping baked in (matches other channels). Ships free on the website, no matter the order total.'
              : 'OFF — shipping is calculated separately as usual at checkout.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPriceIncludesShipping(v => !v)}
          className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${
            priceIncludesShipping ? 'bg-gold' : 'bg-gray-200'
          }`}
        >
          <span
            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-xs ${
              priceIncludesShipping ? 'left-7' : 'left-1'
            }`}
          />
        </button>
      </div>

      {/* ── 8. Product Variants Section ── */}
      <div className="border border-border-warm rounded-2xl overflow-hidden bg-white shadow-xs">
        <div
          onClick={() => setHasVariants(v => !v)}
          className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-ivory/40 transition-colors select-none"
        >
          <input
            type="checkbox"
            checked={hasVariants}
            onChange={e => setHasVariants(e.target.checked)}
            className="w-4 h-4 accent-gold rounded cursor-pointer"
          />
          <div>
            <p className="text-charcoal text-sm font-semibold">
              {isMr ? 'या उत्पादनाचे प्रकार आहेत (Size, Color, इत्यादी)' : 'This product has variants (size, color, etc.)'}
            </p>
            <p className="text-charcoal-light text-xs">
              {isMr ? 'वेगवेगळे पॅटर्न, आकार, फोटो व स्टॉक जोडा' : 'Define option types, generate combinations, and assign individual SKUs, stock, and photos.'}
            </p>
          </div>
        </div>

        {hasVariants && (
          <div className="border-t border-border-warm bg-ivory/20 p-4 sm:p-5 space-y-4">
            <div className="space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-charcoal-light">Option Types</p>
              {variantOptionTypes.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    placeholder="Option name (e.g. Size)"
                    value={opt.name}
                    onChange={e => updateOptionType(idx, 'name', e.target.value)}
                    className="w-32 sm:w-40 px-3 py-2 bg-white border border-border-warm rounded-xl text-charcoal text-xs focus:outline-none focus:border-gold"
                  />
                  <input
                    placeholder="Values, comma separated (e.g. Small, Medium, Large)"
                    value={opt.valuesText}
                    onChange={e => updateOptionType(idx, 'valuesText', e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border border-border-warm rounded-xl text-charcoal text-xs focus:outline-none focus:border-gold"
                  />
                  {variantOptionTypes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeOptionType(idx)}
                      className="p-1.5 text-charcoal-light hover:text-red-500 transition-colors"
                      title="Remove option type"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={addOptionType}
                className="text-gold text-xs font-semibold hover:underline flex items-center gap-1"
              >
                + Add Option Type
              </button>
            </div>

            <button
              type="button"
              onClick={regenerateVariantRows}
              className="flex items-center gap-2 border border-gold/60 text-charcoal hover:bg-gold/10 text-xs font-semibold px-4 py-2 rounded-xl transition-colors bg-white shadow-xs"
            >
              <Wand2 className="w-3.5 h-3.5 text-gold" />
              Generate Variants
            </button>

            {variantRows.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-border-warm bg-white shadow-xs">
                <table className="w-full text-xs min-w-[700px]">
                  <thead>
                    <tr className="border-b border-border-warm bg-ivory-dark/60 text-charcoal-light">
                      <th className="text-left py-2.5 px-3 font-semibold">Variant</th>
                      <th className="text-left py-2.5 px-3 font-semibold">SKU</th>
                      <th className="text-left py-2.5 px-3 font-semibold">Barcode</th>
                      <th className="text-left py-2.5 px-3 font-semibold">Price Override</th>
                      <th className="text-left py-2.5 px-3 font-semibold">Stock</th>
                      <th className="text-left py-2.5 px-3 font-semibold">Photos (up to 3)</th>
                      <th className="text-center py-2.5 px-3 font-semibold">Active</th>
                      <th className="py-2.5 px-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-warm">
                    {variantRows.map(row => (
                      <tr key={row._key} className="hover:bg-ivory/40 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-charcoal whitespace-nowrap">
                          {row.name}
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={row.sku}
                            onChange={e => updateVariantRow(row._key, 'sku', e.target.value.toUpperCase())}
                            className="w-28 px-2 py-1 bg-white border border-border-warm rounded-lg text-charcoal font-mono text-xs focus:outline-none focus:border-gold"
                            placeholder="SKU"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={row.barcode}
                            onChange={e => updateVariantRow(row._key, 'barcode', e.target.value)}
                            className="w-24 px-2 py-1 bg-white border border-border-warm rounded-lg text-charcoal font-mono text-xs focus:outline-none focus:border-gold"
                            placeholder="Barcode"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.price_override ?? ''}
                            onChange={e => updateVariantRow(row._key, 'price_override', e.target.value === '' ? null : Number(e.target.value))}
                            placeholder={price ? `₹${price}` : '0'}
                            className="w-20 px-2 py-1 bg-white border border-border-warm rounded-lg text-charcoal text-xs focus:outline-none focus:border-gold"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min="0"
                            value={row.stock}
                            onChange={e => updateVariantRow(row._key, 'stock', Number(e.target.value))}
                            className="w-16 px-2 py-1 bg-white border border-border-warm rounded-lg text-charcoal text-xs focus:outline-none focus:border-gold"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            {[0, 1, 2].map(slot => {
                              const url = row.images[slot];
                              if (url) {
                                return (
                                  <div key={slot} className="relative group w-7 h-7 rounded overflow-hidden border border-border-warm bg-white shrink-0 shadow-xs">
                                    <img src={url} alt="" className="w-full h-full object-cover" />
                                    <button
                                      type="button"
                                      onClick={() => removeVariantRowImage(row._key, url)}
                                      className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <X className="w-2 h-2 text-white" />
                                    </button>
                                  </div>
                                );
                              }
                              if (slot === row.images.length) {
                                return (
                                  <label
                                    key={slot}
                                    className={`w-7 h-7 border border-dashed border-border-warm hover:border-gold rounded flex items-center justify-center cursor-pointer text-charcoal-light hover:text-gold transition-colors shrink-0 bg-white ${row._uploading ? 'opacity-50 pointer-events-none' : ''}`}
                                  >
                                    {row._uploading
                                      ? <Loader2 className="w-3 h-3 animate-spin text-gold" />
                                      : <Plus className="w-3 h-3" />
                                    }
                                    <input
                                      type="file"
                                      accept="image/jpeg,image/jpg,image/png,image/webp"
                                      className="hidden"
                                      onChange={e => handleVariantRowImageUpload(row._key, e)}
                                      disabled={row._uploading}
                                    />
                                  </label>
                                );
                              }
                              return <div key={slot} className="w-7 h-7 shrink-0" />;
                            })}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={row.is_active}
                            onChange={e => updateVariantRow(row._key, 'is_active', e.target.checked)}
                            className="w-4 h-4 accent-gold cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <button
                            type="button"
                            onClick={() => removeVariantRow(row._key)}
                            className="text-charcoal-light hover:text-red-500 p-1 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 9. Storage Location (Rack · Box · Slot) ── */}
      <div>
        <label className={`${labelCls} flex items-center gap-1.5`}>
          <MapPin className="w-3.5 h-3.5 text-gold" />
          <span>{isMr ? 'साठवणूक स्थान (रॅक · बॉक्स · स्लॉट)' : 'Storage Location (Rack · Box · Slot)'}</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            value={rackNumber}
            onChange={e => setRackNumber(e.target.value)}
            placeholder="Rack (e.g. A1)"
            className={`${inputCls} font-mono`}
          />
          <input
            type="text"
            value={boxNumber}
            onChange={e => setBoxNumber(e.target.value)}
            placeholder="Box (e.g. B2)"
            className={`${inputCls} font-mono`}
          />
          <input
            type="text"
            value={slotNumber}
            onChange={e => setSlotNumber(e.target.value)}
            placeholder="Slot (e.g. S2)"
            className={`${inputCls} font-mono`}
          />
        </div>
      </div>

      {/* ── 10. Vendor (QRA Status omitted as requested) ── */}
      <div>
        <label className={labelCls}>
          {isMr ? 'व्हेंडर (विक्रेता)' : 'Vendor'}
        </label>
        <select
          value={vendorId}
          onChange={e => setVendorId(e.target.value)}
          className={inputCls}
        >
          {VENDOR_OPTIONS.map(v => (
            <option key={v} value={v === 'No vendor' ? '' : v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {/* ── 11. Product Images ── */}
      <div>
        <label className={labelCls}>
          {isMr ? 'उत्पादनाचे फोटो (Product Images)' : 'Product Images'}
        </label>
        <div className="space-y-3">
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2.5">
              {images.map((url, idx) => (
                <div key={idx} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-border-warm bg-white shadow-xs">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(url)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                  {idx === 0 && (
                    <span className="absolute bottom-1 left-1 bg-gold text-charcoal text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                      Cover
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <label className={`flex items-center gap-2.5 px-4 py-3.5 border-2 border-dashed border-border-warm hover:border-gold rounded-xl cursor-pointer transition-colors bg-ivory/30 ${uploadingImage ? 'opacity-50 pointer-events-none' : ''}`}>
            {uploadingImage ? (
              <>
                <Loader2 className="w-4 h-4 text-gold animate-spin" />
                <span className="text-charcoal-light text-xs font-medium">{isMr ? 'अपलोड होत आहे...' : 'Uploading photos...'}</span>
              </>
            ) : (
              <>
                <ImagePlus className="w-4 h-4 text-gold shrink-0" />
                <span className="text-charcoal-light text-xs font-medium">
                  {isMr ? 'फोटो अपलोड करण्यासाठी क्लिक करा (JPG, PNG, WebP — कमाल 5MB)' : 'Click to upload photos (JPG, PNG, WebP — max 5MB each)'}
                </span>
              </>
            )}
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={handleImageFiles}
              disabled={uploadingImage}
            />
          </label>

          <div className="flex gap-2">
            <input
              type="text"
              value={imageUrlInput}
              onChange={e => setImageUrlInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addImageUrls(); } }}
              placeholder="Or paste image URL(s) — separate multiple with | or comma"
              className={`${inputCls} text-xs`}
            />
            <button
              type="button"
              onClick={addImageUrls}
              className="px-4 py-2 bg-ivory border border-gold/40 text-charcoal hover:bg-gold/15 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 shadow-xs"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* ── 12. Publish to Website Toggle ── */}
      <div className="flex items-center justify-between p-4 bg-ivory/40 border border-border-warm rounded-xl">
        <div>
          <p className="text-charcoal text-sm font-semibold">
            {isMr ? 'वेबसाईटवर प्रकाशित करा (Publish to Website)' : 'Publish to Website'}
          </p>
          <p className="text-charcoal-light text-xs mt-0.5">
            {isPublished
              ? (isMr ? 'सक्रिय: हे उत्पादन ग्राहकांना दिसेल' : 'Visible in catalog and shop searches')
              : (isMr ? 'लपवले: हे उत्पादन ग्राहकांना दिसणार नाही' : 'Hidden from storefront')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsPublished(v => !v)}
          className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${
            isPublished ? 'bg-gold' : 'bg-gray-200'
          }`}
        >
          <span
            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-xs ${
              isPublished ? 'left-7' : 'left-1'
            }`}
          />
        </button>
      </div>

      {/* ── 13. New Arrival & Best Seller Badges ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-center justify-between p-3.5 bg-ivory/40 border border-border-warm rounded-xl">
          <p className="text-charcoal text-sm font-medium">New Arrival</p>
          <button
            type="button"
            onClick={() => setIsNewArrival(v => !v)}
            className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${
              isNewArrival ? 'bg-gold' : 'bg-gray-200'
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-xs ${
                isNewArrival ? 'left-7' : 'left-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between p-3.5 bg-ivory/40 border border-border-warm rounded-xl">
          <p className="text-charcoal text-sm font-medium">Best Seller</p>
          <button
            type="button"
            onClick={() => setIsBestSeller(v => !v)}
            className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${
              isBestSeller ? 'bg-gold' : 'bg-gray-200'
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-xs ${
                isBestSeller ? 'left-7' : 'left-1'
              }`}
            />
          </button>
        </div>
      </div>
      <p className="text-charcoal-light text-xs -mt-3">
        These add &quot;New&quot; / &quot;Bestseller&quot; badges individually on the storefront.
      </p>

      {/* ── 14. Size Chart (optional) ── */}
      <div>
        <label className={labelCls}>
          {isMr ? 'साईज चार्ट (ऐच्छिक)' : 'Size Chart (optional)'}
        </label>
        <p className="text-charcoal-light text-xs mb-2">
          Upload one image — a &quot;View Size Chart&quot; link appears on the product page only when this is set.
        </p>

        {sizeChartUrl ? (
          <div className="flex items-center gap-3 p-2.5 bg-ivory/40 border border-border-warm rounded-xl">
            <img src={sizeChartUrl} alt="Size chart" className="w-14 h-14 object-cover rounded-lg border border-border-warm" />
            <span className="text-charcoal-light text-xs flex-1 truncate font-mono">{sizeChartUrl}</span>
            <button
              type="button"
              onClick={() => setSizeChartUrl('')}
              className="text-red-600 hover:text-red-700 text-xs px-2.5 py-1 bg-red-50 border border-red-200 rounded-lg transition-colors font-medium"
            >
              Remove
            </button>
          </div>
        ) : (
          <label className={`flex items-center gap-2.5 px-4 py-3 border-2 border-dashed border-border-warm hover:border-gold rounded-xl cursor-pointer transition-colors bg-ivory/30 ${uploadingSizeChart ? 'opacity-50 pointer-events-none' : ''}`}>
            {uploadingSizeChart ? (
              <>
                <Loader2 className="w-4 h-4 text-gold animate-spin" />
                <span className="text-xs text-charcoal-light">Uploading size chart...</span>
              </>
            ) : (
              <>
                <ImagePlus className="w-4 h-4 text-gold" />
                <span className="text-xs text-charcoal-light">Upload size chart image</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleSizeChartUpload}
              disabled={uploadingSizeChart}
              className="hidden"
            />
          </label>
        )}
      </div>

      {/* ── 15. Description ── */}
      <div>
        <label className={labelCls}>
          {isMr ? 'उत्पादन वर्णन (Description)' : 'Description'}
        </label>
        <textarea
          rows={3}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Product description — material, occasion, specifications, styling advice..."
          className={`${inputCls} resize-none font-normal`}
        />
      </div>

      {/* ── Error & Success notices ── */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-medium">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-gold/15 border border-gold/40 rounded-xl text-charcoal text-xs font-medium flex items-center gap-2">
          <Check className="w-4 h-4 text-gold shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ── 16. Action Buttons at Footer ── */}
      <div className="flex items-center justify-between gap-3 pt-3 border-t border-border-warm flex-wrap">
        <button
          type="button"
          onClick={() => setIsStatusEditorOpen(true)}
          disabled={allStatusImages.length === 0}
          className="flex items-center gap-1.5 border-2 border-gold text-gold hover:bg-gold hover:text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 disabled:pointer-events-none shadow-xs"
          title="Create WhatsApp Status images with price & details stickers"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isMr ? 'स्टेटस फोटो एडिटर' : 'Photo Edit for Status'}</span>
        </button>

        <div className="flex items-center gap-2.5 ml-auto">
          <button
            type="button"
            onClick={() => router.back()}
            className="border border-border-warm hover:border-gold hover:text-gold text-charcoal px-5 py-2.5 rounded-xl text-xs font-medium transition-colors bg-white shadow-xs"
          >
            {isMr ? 'रद्द करा' : 'Cancel'}
          </button>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 bg-charcoal hover:bg-charcoal/90 text-white font-semibold px-6 py-2.5 rounded-xl text-xs transition-all disabled:opacity-50 shadow-sm active:scale-95"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin text-white" />}
            <span>
              {saving
                ? (isMr ? 'सेव्ह होत आहे...' : 'Saving...')
                : mode === 'create'
                ? (isMr ? 'उत्पादन जोडा' : 'Add Item')
                : (isMr ? 'बदल सेव्ह करा' : 'Update Item')}
            </span>
          </button>
        </div>
      </div>

      {/* WhatsApp Status Photo Editor Modal */}
      <StatusPhotoEditorModal
        isOpen={isStatusEditorOpen}
        onClose={() => setIsStatusEditorOpen(false)}
        images={allStatusImages}
        productName={productName}
        price={price ? Number(price) : null}
        regularPrice={originalPrice ? Number(originalPrice) : null}
      />
    </form>
  );
}
