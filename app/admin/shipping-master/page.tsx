import ShippingMasterApp from '@/components/shipping-printer/ShippingMasterApp';

export const metadata = {
  title: 'Order Shipping Master | Shubhangi Collection Admin',
  description: 'Scan parcel QR codes at pickup to log orders in the shipping master.',
};

export default function AdminShippingMasterPage() {
  return <ShippingMasterApp />;
}
