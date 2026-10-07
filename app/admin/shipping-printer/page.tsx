import ShippingPrinterApp from '@/components/shipping-printer/ShippingPrinterApp';

export const metadata = {
  title: 'Address Print + QR | Shubhangi Collection Admin',
  description: 'Address printing utility with order-number QR codes for pickup scanning.',
};

export default function AdminShippingPrinterPage() {
  return <ShippingPrinterApp />;
}
