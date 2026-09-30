import { Product } from './types';
import { formatPrice } from './utils';

const WHATSAPP_NUMBER = '919004954792';
const BUSINESS_NAME = 'Shubhangi Collection';

export interface WhatsAppOrderDetails {
  variantLabel?: string;
  variantSku?: string;
  price?: number | null;
  quantity?: number;
}

export function generateWhatsAppUrl(
  product: Product,
  productUrl: string,
  orderDetails?: WhatsAppOrderDetails
): string {
  const isDirectOrder = Boolean(orderDetails?.variantLabel || orderDetails?.quantity);
  const qty = orderDetails?.quantity ?? 1;
  const effectivePrice = orderDetails?.price !== undefined ? orderDetails.price : product.price;
  const effectiveSku = orderDetails?.variantSku || product.sku;

  let message = `Hello ${BUSINESS_NAME},\n\n`;

  if (isDirectOrder) {
    message += `I would like to order:\n\n`;
    message += `Product: ${product.name}\n`;
    if (orderDetails?.variantLabel) {
      message += `Variant: ${orderDetails.variantLabel}\n`;
    } else if (product.color) {
      message += `Color: ${product.color}\n`;
    }
    message += `SKU: ${effectiveSku}\n`;
    message += `Quantity: ${qty}\n`;

    if (effectivePrice !== null) {
      const total = effectivePrice * qty;
      if (qty > 1) {
        message += `Price: ${formatPrice(total, product.currency)} (${formatPrice(effectivePrice, product.currency)} each)\n`;
      } else {
        message += `Price: ${formatPrice(effectivePrice, product.currency)}\n`;
      }
    }

    message += `Product link: ${productUrl}\n\n`;
    message += `Please confirm availability and share payment / delivery details.`;
  } else {
    message += `I am interested in this product:\n\n`;
    message += `Product: ${product.name}\n`;
    if (product.color) {
      message += `Color: ${product.color}\n`;
    }
    message += `SKU: ${effectiveSku}\n`;

    if (effectivePrice !== null) {
      if (product.regular_price && product.regular_price > effectivePrice) {
        message += `Price: ${formatPrice(effectivePrice, product.currency)} (MRP: ${formatPrice(product.regular_price, product.currency)})\n`;
      } else {
        message += `Price: ${formatPrice(effectivePrice, product.currency)}\n`;
      }
    }

    message += `Product link: ${productUrl}\n\n`;
    message += `Please share availability and purchase details.`;
  }

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
