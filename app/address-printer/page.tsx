import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import AddressPrinterApp from '@/components/address-printer/AddressPrinterApp';

export const metadata = {
  title: 'Address Printer — Shubhangi Collection',
  description: 'Automated WhatsApp shipping address printing utility for courier parcel labels.',
};

export default function AddressPrinterPage() {
  return (
    <>
      <div className="no-print">
        <Header />
      </div>
      <AddressPrinterApp />
      <div className="no-print">
        <Footer />
      </div>
    </>
  );
}
