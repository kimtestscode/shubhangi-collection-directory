'use client';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import AdminHelpPage from '../admin/help/page';

export default function PublicHelpPage() {
  return (
    <div className="min-h-screen flex flex-col bg-ivory">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <AdminHelpPage />
      </main>
      <Footer />
    </div>
  );
}
