import { Product } from './types';
import { formatPrice } from './utils';

const WHATSAPP_NUMBER = '919004954792';
const BUSINESS_NAME = 'Shubhangi Collection';

export function generateWhatsAppUrl(product: Product, productUrl: string): string {
  let message =
    `Hello ${BUSINESS_NAME},\n\n` +
    `I am interested in this product:\n\n` +
    `Product: ${product.name}\n`;

  if (product.color) {
    message += `Color: ${product.color}\n`;
  }

  message += `SKU: ${product.sku}\n`;

  if (product.price !== null) {
    if (product.regular_price && product.regular_price > product.price) {
      message += `Price: ${formatPrice(product.price, product.currency)} (MRP: ${formatPrice(product.regular_price, product.currency)})\n`;
    } else {
      message += `Price: ${formatPrice(product.price, product.currency)}\n`;
    }
  }

  message +=
    `Product link: ${productUrl}\n\n` +
    `Please share availability and purchase details.`;

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
