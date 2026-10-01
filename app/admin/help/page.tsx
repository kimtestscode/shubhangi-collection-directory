'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Layers,
  Printer,
  FileSpreadsheet,
  MessageCircle,
  HelpCircle,
  ChevronRight,
  Move,
  Download,
  Share2,
  CheckCircle2,
  Languages,
  ArrowRight,
  Package,
  Plus,
  BookOpen,
  ShoppingBag,
} from 'lucide-react';
import { useLanguage } from '@/lib/languageContext';

export default function AdminHelpPage() {
  const { lang, setLang } = useLanguage();
  const [activeTab, setActiveTab] = useState<'all' | 'status' | 'variants' | 'bulk' | 'address' | 'client'>('all');

  const isMr = lang === 'mr';

  const categories = [
    { id: 'all', label: isMr ? 'सर्व माहिती' : 'All Topics' },
    { id: 'status', label: isMr ? '📱 स्टेटस फोटो एडिटर' : '📱 Status Photo Editor' },
    { id: 'variants', label: isMr ? '💎 व्हेरियंट्स (रंग/साईझ)' : '💎 Variants Setup' },
    { id: 'bulk', label: isMr ? '⚡ बल्क एडिटर' : '⚡ Bulk Editor' },
    { id: 'address', label: isMr ? '🏷️ पत्ता प्रिंटर' : '🏷️ Address Printer' },
    { id: 'client', label: isMr ? '💬 व्हॉट्सॲप ऑर्डरिंग' : '💬 WhatsApp Ordering' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-charcoal to-charcoal/90 text-ivory p-6 sm:p-8 rounded-3xl shadow-xl border border-white/10 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/20 text-gold text-xs font-semibold border border-gold/30">
              <BookOpen className="w-3.5 h-3.5" />
              <span>{isMr ? 'वापर मार्गदर्शक आणि मदत' : 'Platform User Guide & Help'}</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">
              {isMr ? 'शुभंगी कलेक्शन प्लॅटफॉर्म कसा वापरावा?' : 'How to use Shubhangi Collection Directory?'}
            </h1>
            <p className="text-sm text-ivory/80 leading-relaxed">
              {isMr
                ? 'हे व्यासपीठ खास आपल्यासाठी बनवले आहे जेणेकरून ग्राहकांना वारंवार फोटो पाठवण्याची गरज पडणार नाही. सर्व वैशिष्ट्ये कशी वापरायची ते खाली सविस्तर दिले आहे.'
                : 'This platform is built to eliminate repetitive photo sharing with clients. Learn how to manage products, edit status images, and fulfill orders smoothly.'}
            </p>
          </div>

          {/* Prominent Language Switcher at Top of Help */}
          <div className="flex-shrink-0 bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/15 flex flex-col gap-2">
            <span className="text-[11px] text-ivory/70 uppercase tracking-wider font-semibold text-center">
              {isMr ? 'भाषा निवडा / Language' : 'Choose Language / भाषा निवडा'}
            </span>
            <div className="flex items-center gap-1.5 bg-black/30 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setLang('mr')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isMr ? 'bg-gold text-charcoal shadow-sm' : 'text-ivory/70 hover:text-white'
                }`}
              >
                मराठी (Marathi)
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  !isMr ? 'bg-gold text-charcoal shadow-sm' : 'text-ivory/70 hover:text-white'
                }`}
              >
                English
              </button>
            </div>
          </div>
        </div>

        {/* Decorative corner glow */}
        <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === cat.id
                ? 'bg-gold text-white shadow-sm'
                : 'bg-white hover:bg-gold/10 text-charcoal border border-border-warm'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* SECTION 1: WHATSAPP STATUS PHOTO EDITOR */}
      {(activeTab === 'all' || activeTab === 'status') && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-border-warm shadow-sm space-y-6">
          <div className="flex items-start justify-between gap-4 border-b border-border-warm pb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-700 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-charcoal">
                  {isMr ? '१. व्हॉट्सॲप स्टेटस फोटो एडिटर (WhatsApp Status Photo Editor)' : '1. WhatsApp Status Photo Editor'}
                </h2>
                <p className="text-xs sm:text-sm text-charcoal-light">
                  {isMr
                    ? 'दागिन्यांच्या फोटोंवर किमतीचा व ऑफरचा स्टिकर लावून थेट व्हॉट्सॲप स्टेटसवर पोस्ट करा'
                    : 'Add Instagram/WhatsApp style price story badges over your photos and post directly'}
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-block bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">
              {isMr ? 'सर्वात महत्त्वाचे' : 'Key Feature'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <p className="text-sm text-charcoal leading-relaxed">
                {isMr ? (
                  <>
                    <strong>हे का बनवले आहे?</strong> ग्राहक नेहमी डिझाईन आणि किमतीचे फोटो मागतात. आता तुम्ही प्रॉडक्ट सेव्ह केल्यावर एका क्लिकमध्ये सर्व फोटोंवर{' '}
                    <span className="bg-black text-white px-2 py-0.5 rounded-full text-xs font-bold">ek piece Rs.1000 free shipping</span> असा स्टिकर लावून स्टेटसवर ठेवू शकता.
                  </>
                ) : (
                  <>
                    <strong>Why this exists:</strong> Customers frequently ask for photos and prices. Instead of manually editing photos in other apps, you can generate ready-to-post story photos with bold price stickers in seconds.
                  </>
                )}
              </p>

              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gold">
                  {isMr ? 'वापरण्याची सोपी पद्धत (Steps to follow):' : 'Step-by-step instructions:'}
                </h3>
                <ul className="space-y-2.5 text-xs sm:text-sm text-charcoal">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-gold/20 text-gold flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                      १
                    </span>
                    <span>
                      {isMr ? (
                        <>नवीन उत्पादन जोडताना किंवा बदलताना फोटो आणि किंमत टाकून <strong>"Photo Edit for Status"</strong> बटनावर दाबा (किंवा प्रॉडक्ट्सच्या यादीतील ✨ चिन्हावर क्लिक करा).</>
                      ) : (
                        <>Upload photos and enter price, then click <strong>"Photo Edit for Status"</strong> next to Save, or click the ✨ icon in the products table.</>
                      )}
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-gold/20 text-gold flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                      २
                    </span>
                    <span>
                      {isMr ? (
                        <>तुमच्या फोटोवर काळ्या रंगाचा ठळक स्टिकर आपोआप दिसेल (उदा. <em>ek piece Rs.1000 free shipping</em>).</>
                      ) : (
                        <>A bold rounded story sticker appears automatically formatted with your product price.</>
                      )}
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-gold/20 text-gold flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                      ३
                    </span>
                    <span>
                      {isMr ? (
                        <><strong>स्टिकर हवा तिथे ओढा (Drag & Drop):</strong> बोटाने किंवा माउसने तो स्टिकर दागिन्यांच्या मोकळ्या जागेत हलवून ठेवा जेणेकरून डिझाईन झाकले जाणार नाही.</>
                      ) : (
                        <><strong>Drag & Drop to Reposition:</strong> Touch and drag the sticker anywhere on screen so it doesn't cover intricate jewellery details.</>
                      )}
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-gold/20 text-gold flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                      ४
                    </span>
                    <span>
                      {isMr ? (
                        <><strong>अजून स्टिकर्स जोडा:</strong> Quick Badges मधून <em>+ 36 inch</em>, <em>+ Limited Stock</em>, <em>+ Opening Video Required</em> किंवा <em>+ Custom Text</em> वर एका क्लिकवर नवीन स्टिकर जोडा.</>
                      ) : (
                        <><strong>Add More Badges:</strong> Click <em>+ 36 inch</em>, <em>+ Limited Stock</em>, or <em>+ Custom Text</em> to add multiple stickers.</>
                      )}
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-gold/20 text-gold flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                      ५
                    </span>
                    <span>
                      {isMr ? (
                        <><strong>मोबाईलवरून थेट स्टेटसवर:</strong> मोबाईलवर असल्यास <strong>"Post directly to WhatsApp"</strong> दाबा; थेट व्हॉट्सॲप स्टेटस शेअरिंग उघडेल! किंवा <strong>"Download Current Image"</strong> वर क्लिक करा.</>
                      ) : (
                        <><strong>Direct Status Posting:</strong> On mobile, tap <strong>"Post directly to WhatsApp / Share"</strong> to open WhatsApp Status instantly, or tap Download Image.</>
                      )}
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Visual Example Card */}
            <div className="bg-ivory rounded-2xl p-4 border border-border-warm flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-40 aspect-[3/4] bg-charcoal rounded-xl relative shadow-md overflow-hidden flex flex-col items-center justify-center border-2 border-gold/40">
                <ShoppingBag className="w-10 h-10 text-gold/40 mb-2" />
                <div className="bg-black/90 text-white font-bold text-[10px] px-2.5 py-1 rounded-full shadow-lg border border-white/20">
                  ek piece Rs.1000 free shipping
                </div>
                <div className="bg-black/90 text-white font-bold text-[9px] px-2 py-0.5 rounded-full shadow-lg mt-3">
                  36 inch
                </div>
                <div className="absolute bottom-1 right-1 text-[8px] text-white/50 bg-black/60 px-1 rounded">
                  Status Ready
                </div>
              </div>
              <div className="text-xs text-charcoal-light font-medium">
                {isMr ? 'अशा प्रकारे सुबक स्टेटस फोटो तयार होतो' : 'Sample ready-to-share status photo'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: VARIABLE PRODUCTS (COLORS & LENGTHS) */}
      {(activeTab === 'all' || activeTab === 'variants') && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-border-warm shadow-sm space-y-6">
          <div className="flex items-start justify-between gap-4 border-b border-border-warm pb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-700 flex items-center justify-center flex-shrink-0">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-charcoal">
                  {isMr ? '२. व्हेरियंट्स व्यवस्थापन (रंग, साईझ, डिझाईन प्रकार)' : '2. Product Variants Setup (Colors, Lengths, Designs)'}
                </h2>
                <p className="text-xs sm:text-sm text-charcoal-light">
                  {isMr
                    ? 'एकाच उत्पादनात अनेक रंग किंवा लांबी (उदा. २४ इंच, ३६ इंच) कसे जोडायचे'
                    : 'Manage products with multiple colors, lengths, or options with separate photos'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 text-sm text-charcoal leading-relaxed">
            <p>
              {isMr ? (
                <>
                  <strong>साधे प्रॉडक्ट वि. व्हेरियंट प्रॉडक्ट:</strong> जर एखादे मंगळसूत्र फक्त एकाच साईझमध्ये असेल तर त्याला व्हेरियंटची गरज नाही. पण जर एकाच डिझाईनमध्ये <strong>२४ इंच, ३० इंच, ३६ इंच</strong> उपलब्ध असतील किंवा <strong>मरून, हिरवा, काळा</strong> असे रंग असतील, तर:
                </>
              ) : (
                <>
                  <strong>Simple vs Variable Products:</strong> If an item comes in multiple sizes (e.g. 24 inch, 36 inch) or stone colors (e.g. Maroon, Green, Black):
                </>
              )}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-ivory/60 p-4 rounded-2xl border border-border-warm space-y-2">
                <span className="text-xs font-bold text-gold uppercase tracking-wider block">
                  {isMr ? 'पायरी १: ऑप्शन्स तयार करा' : 'Step 1: Define Options'}
                </span>
                <p className="text-xs text-charcoal-light">
                  {isMr ? (
                    <>
                      उत्पादन फॉर्ममध्ये <strong>"This product has multiple variants"</strong> टिक करा. <br />
                      Option Type मध्ये <em>Length</em> किंवा <em>Color</em> टाका आणि Values मध्ये <em>24 inch, 36 inch</em> टाका.
                    </>
                  ) : (
                    <>
                      Check <strong>"This product has multiple variants"</strong>. Enter Option Name (e.g., <em>Length</em> or <em>Color</em>) and values (e.g., <em>24 inch, 36 inch</em>).
                    </>
                  )}
                </p>
              </div>

              <div className="bg-ivory/60 p-4 rounded-2xl border border-border-warm space-y-2">
                <span className="text-xs font-bold text-gold uppercase tracking-wider block">
                  {isMr ? 'पायरी २: स्वतंत्र फोटो व किंमत' : 'Step 2: Assign Photos & Price'}
                </span>
                <p className="text-xs text-charcoal-light">
                  {isMr ? (
                    <>
                      खाली तयार झालेल्या टेबलमध्ये प्रत्येक व्हेरियंटसाठी त्याचा स्वतःचा फोटो अपलोड करा. २४ इंचाची किंमत ८०० रु. आणि ३६ इंचाची १००० रु. असल्यास Price Override मध्ये टाका.
                    </>
                  ) : (
                    <>
                      Upload dedicated photos for each variant in the table. Enter price override if different lengths have different rates.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-xs sm:text-sm text-emerald-800">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
              <span>
                {isMr
                  ? 'ग्राहक जेव्हा डिरेक्टरीमध्ये ३६ इंच निवडतात तेव्हा स्क्रीनवरील फोटो आणि किंमत आपोआप ३६ इंचाची होते!'
                  : 'When customers select a variant on your live directory, the photos and price switch dynamically!'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: BULK EDITOR */}
      {(activeTab === 'all' || activeTab === 'bulk') && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-border-warm shadow-sm space-y-6">
          <div className="flex items-start justify-between gap-4 border-b border-border-warm pb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/15 text-blue-700 flex items-center justify-center flex-shrink-0">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-charcoal">
                  {isMr ? '३. बल्क एडिटर (एकाच वेळी अनेक उत्पादने बदलणे)' : '3. Bulk Inventory Editor'}
                </h2>
                <p className="text-xs sm:text-sm text-charcoal-light">
                  {isMr
                    ? 'एकाच टेबलमध्ये सर्व उत्पादनांची किंमत, स्टॉक आणि नावे एक्सेलसारखी भरा'
                    : 'Edit prices, names, and stock directly in a spreadsheet-style table'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-sm text-charcoal">
            <p>
              {isMr ? (
                <>
                  ऍडमीन डॅशबोर्डवर उजव्या कोपऱ्यात <strong>"Bulk Edit"</strong> चे बटन आहे. त्यावर क्लिक केल्यावर टेबलमधील सर्व रकाने लिहिण्यायोग्य (Editable) होतात.
                </>
              ) : (
                <>
                  On the main admin dashboard, click <strong>"Bulk Edit"</strong> in the top-right corner to edit product names, prices, and stock in bulk without opening individual forms.
                </>
              )}
            </p>
            <ul className="list-disc list-inside text-xs sm:text-sm text-charcoal-light space-y-1.5 pl-2">
              <li>{isMr ? 'किंमत बदलायची असल्यास थेट बॉक्समध्ये नवीन किंमत टाका.' : 'Type new prices directly into the price column.'}</li>
              <li>{isMr ? 'स्टॉक वाढवायचा किंवा संपवायचा असल्यास स्टॉकच्या आकड्यावर क्लिक करून बदला.' : 'Adjust stock quantities instantly.'}</li>
              <li>{isMr ? 'बदल पूर्ण झाल्यावर हिरव्या रंगाच्या "Save All Changes" बटनावर दाबा.' : 'Click "Save All Changes" to save all edits in one batch.'}</li>
            </ul>
          </div>
        </div>
      )}

      {/* SECTION 4: ADDRESS PRINTER */}
      {(activeTab === 'all' || activeTab === 'address') && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-border-warm shadow-sm space-y-6">
          <div className="flex items-start justify-between gap-4 border-b border-border-warm pb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-700 flex items-center justify-center flex-shrink-0">
                <Printer className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-charcoal">
                  {isMr ? '४. पार्सल पत्ता आणि लेबल प्रिंटर (Address Printer)' : '4. Parcel Address & Label Printer'}
                </h2>
                <p className="text-xs sm:text-sm text-charcoal-light">
                  {isMr
                    ? 'ग्राहकाने व्हॉट्सॲपवर पाठवलेला पत्ता पेस्ट करा आणि एका सेकंदात सुबक पार्सल लेबल प्रिंट करा'
                    : 'Paste messy customer WhatsApp addresses to generate neat parcel shipping labels'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 text-sm text-charcoal">
            <p>
              {isMr ? (
                <>
                  डाव्या मेनूतील <strong>"पत्ता प्रिंटर" (Address Printer)</strong> वर जा. ग्राहकाने व्हॉट्सॲपवर पाठवलेला पत्ता जसाच्या तसा पेस्ट करा. सिस्टीम आपोआप नाव, फोन नंबर, पत्ता आणि पिनकोड ओळखून योग्य रचनेत आणते.
                </>
              ) : (
                <>
                  Navigate to <strong>"Address Printer"</strong> from the sidebar. Paste the raw text copied from WhatsApp. The system automatically extracts recipient name, phone number, address lines, and pincode.
                </>
              )}
            </p>
            <div className="flex items-center gap-3 pt-2">
              <Link
                href="/admin/address-printer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-charcoal text-white hover:bg-gold transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isMr ? 'पत्ता प्रिंटर उघडा' : 'Open Address Printer'}</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: CLIENT DIRECTORY & WHATSAPP ORDERS */}
      {(activeTab === 'all' || activeTab === 'client') && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-border-warm shadow-sm space-y-6">
          <div className="flex items-start justify-between gap-4 border-b border-border-warm pb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-700 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-charcoal">
                  {isMr ? '५. ग्राहकांसाठी डिरेक्टरी आणि व्हॉट्सॲप ऑर्डरिंग' : '5. Customer Directory & WhatsApp Ordering'}
                </h2>
                <p className="text-xs sm:text-sm text-charcoal-light">
                  {isMr
                    ? 'ग्राहकांना कॅटलॉग लिंक पाठवा; ते स्वतः फोटो पाहून थेट व्हॉट्सॲपवर ऑर्डर पाठवतील'
                    : 'Share your directory link with buyers so they can explore inventory and order on WhatsApp'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 text-sm text-charcoal leading-relaxed">
            <p>
              {isMr ? (
                <>
                  जेव्हा एखादा ग्राहक नवीन दागिन्यांचे फोटो किंवा स्टॉक विचारेल, तेव्हा त्यांना तुमच्या वेबसाईटची लिंक पाठवा:{' '}
                  <code className="bg-ivory px-2 py-0.5 rounded text-gold font-mono font-bold text-xs">
                    https://shubhangi-collection-directory.vercel.app
                  </code>
                </>
              ) : (
                <>
                  Instead of sending dozens of individual photos into individual chats, share your directory link:{' '}
                  <code className="bg-ivory px-2 py-0.5 rounded text-gold font-mono font-bold text-xs">
                    https://shubhangi-collection-directory.vercel.app
                  </code>
                </>
              )}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 bg-ivory rounded-xl border border-border-warm space-y-1">
                <div className="font-bold text-xs text-charcoal">
                  {isMr ? '१. ग्राहक स्वतः निवडतात' : '1. Self Browsing'}
                </div>
                <div className="text-[11px] text-charcoal-light">
                  {isMr
                    ? 'कॅटेगरीनुसार (मंगळसूत्र, नेकलेस, इ.) सर्व उपलब्ध स्टॉक ग्राहक स्वतः पाहू शकतात.'
                    : 'Clients view photos, sizes, and real-time stock availability without asking.'}
                </div>
              </div>

              <div className="p-3.5 bg-ivory rounded-xl border border-border-warm space-y-1">
                <div className="font-bold text-xs text-charcoal">
                  {isMr ? '२. व्हेरियंट्स बदल' : '2. Variant Switching'}
                </div>
                <div className="text-[11px] text-charcoal-light">
                  {isMr
                    ? 'त्यांना आवडलेला रंग किंवा लांबी निवडल्यास फोटो बदलतो.'
                    : 'Clients switch colors or inches and see exact corresponding photos.'}
                </div>
              </div>

              <div className="p-3.5 bg-ivory rounded-xl border border-border-warm space-y-1">
                <div className="font-bold text-xs text-charcoal">
                  {isMr ? '३. एका क्लिकवर व्हॉट्सॲप ऑर्डर' : '3. One-Click Order'}
                </div>
                <div className="text-[11px] text-charcoal-light">
                  {isMr
                    ? '"Order on WhatsApp" दाबताच प्रॉडक्टच्या लिंक आणि नावासह तुमच्याकडे मेसेज येतो.'
                    : 'Tapping WhatsApp button sends a pre-formatted enquiry message to your WhatsApp.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Navigation Footer */}
      <div className="bg-ivory-dark/40 rounded-2xl p-4 sm:p-6 border border-border-warm flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div>
          <h4 className="text-sm font-bold text-charcoal">
            {isMr ? 'काही अडचण किंवा प्रश्न असल्यास?' : 'Need any help?'}
          </h4>
          <p className="text-xs text-charcoal-light">
            {isMr
              ? 'आपण कोणत्याही वेळी नवीन उत्पादने जोडू शकता आणि स्टेटस फोटो तयार करू शकता.'
              : 'You can start adding products and generating ready WhatsApp status images right away.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products/new"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gold text-white hover:bg-gold-dark transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isMr ? 'नवीन उत्पादन जोडा' : 'Add New Product'}</span>
          </Link>
          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-charcoal text-white hover:bg-charcoal/90 transition-colors"
          >
            <Package className="w-3.5 h-3.5" />
            <span>{isMr ? 'उत्पादने पहा' : 'View Products'}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
