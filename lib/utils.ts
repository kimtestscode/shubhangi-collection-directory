export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatPrice(price: number | null, currency = 'INR'): string {
  if (price === null) return 'Price on request';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export const CATEGORIES = [
  'All',
  'Necklaces',
  'Earrings',
  'Bangles',
  'Bracelets',
  'Rings',
  'Maang Tikka',
  'Sets',
  'Anklets',
  'Nose Pins',
  'Other',
];
