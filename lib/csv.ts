import { Product, ProductInsert, Availability } from './types';
import { slugify } from './utils';

const CSV_HEADERS = [
  'SKU',
  'Name',
  'Slug',
  'Category',
  'Product Type',
  'Parent SKU',
  'Color',
  'Regular Price',
  'Offer Price',
  'Currency',
  'Availability',
  'Featured',
  'Thumbnail',
  'Images',
  'Description'
];

function escapeCSVField(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

export function exportProductsToCSV(products: Product[]): string {
  const lines: string[] = [];
  lines.push(CSV_HEADERS.map(h => `"${h}"`).join(','));

  for (const p of products) {
    const row = [
      escapeCSVField(p.sku),
      escapeCSVField(p.name),
      escapeCSVField(p.slug),
      escapeCSVField(p.category),
      escapeCSVField(p.product_type || 'simple'),
      escapeCSVField(p.parent_sku || ''),
      escapeCSVField(p.color || ''),
      escapeCSVField(p.regular_price !== null && p.regular_price !== undefined ? p.regular_price : ''),
      escapeCSVField(p.price !== null && p.price !== undefined ? p.price : ''),
      escapeCSVField(p.currency || 'INR'),
      escapeCSVField(p.availability || 'available'),
      escapeCSVField(p.featured ? 'TRUE' : 'FALSE'),
      escapeCSVField(p.thumbnail || ''),
      escapeCSVField((p.images || []).join(';')),
      escapeCSVField(p.description || '')
    ];
    lines.push(row.join(','));
  }

  return lines.join('\n');
}

export function parseCSVToProducts(csvText: string): Partial<ProductInsert>[] {
  const lines = parseCSVRows(csvText);
  if (lines.length < 2) return [];

  const headers = lines[0].map(h => h.trim().toLowerCase());

  const getCol = (row: string[], colNames: string[]): string => {
    for (const name of colNames) {
      const idx = headers.indexOf(name.toLowerCase());
      if (idx !== -1 && row[idx] !== undefined) {
        return row[idx].trim();
      }
    }
    return '';
  };

  const results: Partial<ProductInsert>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    if (row.length === 0 || (row.length === 1 && !row[0].trim())) continue;

    const sku = getCol(row, ['sku', 'product code']);
    const name = getCol(row, ['name', 'product name', 'title']);

    if (!sku || !name) continue;

    const category = getCol(row, ['category']) || 'Other';
    const rawSlug = getCol(row, ['slug']) || slugify(name);
    const productType = (getCol(row, ['product type', 'type']) || 'simple').toLowerCase() as Product['product_type'];
    const parentSku = getCol(row, ['parent sku', 'parent_sku']) || null;
    const color = getCol(row, ['color', 'variation color']) || null;

    const regPriceStr = getCol(row, ['regular price', 'regular_price', 'mrp']);
    const regularPrice = regPriceStr !== '' && !isNaN(Number(regPriceStr)) ? Number(regPriceStr) : null;

    const offerPriceStr = getCol(row, ['offer price', 'sale price', 'price', 'sale_price', 'offer_price']);
    const price = offerPriceStr !== '' && !isNaN(Number(offerPriceStr)) ? Number(offerPriceStr) : null;

    const currency = getCol(row, ['currency']) || 'INR';
    const availabilityRaw = getCol(row, ['availability', 'status']).toLowerCase().replace(/[\s-]/g, '_');

    let availability: Availability = 'available';
    if (['out_of_stock', 'outofstock'].includes(availabilityRaw)) availability = 'out_of_stock';
    else if (['coming_soon', 'comingsoon'].includes(availabilityRaw)) availability = 'coming_soon';
    else if (['hidden'].includes(availabilityRaw)) availability = 'hidden';

    const featuredStr = getCol(row, ['featured']).toLowerCase();
    const featured = ['true', 'yes', '1'].includes(featuredStr);

    const thumbnail = getCol(row, ['thumbnail', 'thumbnail url']);
    const imagesStr = getCol(row, ['images', 'image urls']);
    const images = imagesStr ? imagesStr.split(/[;,]/).map(s => s.trim()).filter(Boolean) : [];

    results.push({
      sku: sku.toUpperCase(),
      name,
      slug: rawSlug,
      category,
      product_type: productType,
      parent_sku: parentSku ? parentSku.toUpperCase() : null,
      color: color || null,
      variant_type: null,
      has_variants: false,
      option_types: null,
      variants: null,
      price,
      regular_price: regularPrice,
      currency,
      availability,
      featured,
      thumbnail: thumbnail || (images.length > 0 ? images[0] : null),
      images: images.length > 0 ? images : (thumbnail ? [thumbnail] : []),
      description: getCol(row, ['description']) || null,
    });
  }

  return results;
}

function parseCSVRows(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentField);
      currentField = '';
      if (currentRow.some(f => f.trim())) rows.push(currentRow);
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some(f => f.trim())) rows.push(currentRow);
  }

  return rows;
}

export function generateSampleCSV(): string {
  const sampleProducts: Product[] = [
    {
      id: '1',
      sku: 'SC-NK-002',
      name: 'Royal Meenakari Choker Set',
      slug: 'royal-meenakari-choker-set',
      category: 'Necklaces',
      product_type: 'simple',
      parent_sku: null,
      color: null,
      variant_type: null,
      has_variants: true,
      option_types: [{ name: 'Color', type: 'Color', values: ['Ruby Red', 'Emerald Green'] }],
      variants: [
        { name: 'Ruby Red', option_values: { Color: 'Ruby Red' }, sku: 'SC-NK-002-RUB', barcode: '', price_override: 3499, stock: 5, images: ['https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800'], image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800' },
        { name: 'Emerald Green', option_values: { Color: 'Emerald Green' }, sku: 'SC-NK-002-EME', barcode: '', price_override: 3499, stock: 3, images: ['https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=800'], image: 'https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=800' },
      ],
      regular_price: 4999,
      price: 3499,
      currency: 'INR',
      availability: 'available',
      featured: true,
      thumbnail: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800',
      images: ['https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800'],
      description: 'Exquisite meenakari choker set with matching earrings. Available in multiple color combinations.',
      created_at: '',
      updated_at: ''
    },
    {
      id: '4',
      sku: 'SC-BN-005',
      name: 'Kundan Brass Bangles',
      slug: 'kundan-brass-bangles',
      category: 'Bangles',
      product_type: 'simple',
      parent_sku: null,
      color: null,
      variant_type: null,
      has_variants: false,
      option_types: null,
      variants: null,
      regular_price: 1999,
      price: 1499,
      currency: 'INR',
      availability: 'available',
      featured: false,
      thumbnail: 'https://images.unsplash.com/photo-1601121141499-b1d1c4e3a67f?w=800',
      images: ['https://images.unsplash.com/photo-1601121141499-b1d1c4e3a67f?w=800'],
      description: 'Single gold kundan brass bangle set of 4.',
      created_at: '',
      updated_at: ''
    }
  ];

  return exportProductsToCSV(sampleProducts);
}
