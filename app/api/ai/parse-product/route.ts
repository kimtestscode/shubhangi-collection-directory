import { NextRequest, NextResponse } from 'next/server';

const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
];

const SYSTEM_INSTRUCTION = `You are an expert AI product cataloguing assistant for Shubhangi Collection, an Indian luxury & imitation jewelry brand.
Your job is to analyze spoken or written product dictation (in English, Marathi, Hindi, or Hinglish) and extract product details into a structured JSON object.

Output ONLY valid JSON matching this exact structure:
{
  "name": string (clean, professional product name in Title Case, e.g. "Royal Polki Choker Necklace Set"),
  "categories": string[] (one or more matching: ["Necklaces", "Earrings", "Rings", "Bracelets", "Combo Sets", "Kids", "Bangles", "Kada", "Chain", "Choker", "Long Necklace", "Mangalsutra", "Pooja Bhandar", "Rani Haar", "Short Mangalsutra", "Mala", "Thushi", "Bugdi", "Nath", "Ear Cuff", "Ear Chain", "Jhumka", "Chinchpeti", "Payal/Anklets", "Kamarpatta", "Hair Accessories", "Bajuband/Armlets"]),
  "subcategories": string[] (zero or more matching: ["American Diamond", "Copper", "Geru", "Micro-Gold", "Victorian", "Moti (Pearl)", "Silver", "German Silver Polish"]),
  "jewelry_type": string (must be one of: "Imitation", "Real", "Semi-Precious", "Fashion", "Antique", "Temple", "1 Gram Gold Formed", default is "Imitation"),
  "price": number or null (selling price in INR, e.g. 1499),
  "original_price": number or null (MRP/original price if mentioned, e.g. 2199),
  "stock_quantity": number (quantity, default 1 if not stated),
  "price_includes_shipping": boolean (true if free shipping / shipping included is mentioned, else false),
  "rack_number": string or null (e.g. "A1", "Rack 2"),
  "box_number": string or null (e.g. "B3"),
  "slot_number": string or null (e.g. "S2"),
  "vendor": string or null (vendor if mentioned),
  "description": string (an elegant, customer-ready description for the website detailing the styling, finish, and occasion)
}

Guidelines:
- If language is Marathi or Hindi, translate the product name and description into clear, elegant English catalog style while keeping traditional jewelry names (e.g. Thushi, Mangalsutra, Choker, Rani Haar, Jhumka, Nath).
- Recognize Marathi/Hindi numbers (e.g., "don hazaar" -> 2000, "ek hazaar panchshet" -> 1500, "paanch piece" -> 5 stock).
- Never return code blocks or markdown, return pure JSON only.`;

export async function POST(req: NextRequest) {
  try {
    const { text, audioBase64, mimeType } = await req.json();

    if (!text && !audioBase64) {
      return NextResponse.json({ error: 'Please provide text or audio to parse.' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured in environment variables.' }, { status: 500 });
    }

    const parts: any[] = [];
    if (audioBase64) {
      parts.push({
        inlineData: {
          data: audioBase64,
          mimeType: mimeType || 'audio/webm',
        },
      });
      parts.push({
        text: text ? `Transcribe and extract product details: ${text}` : 'Transcribe this voice dictation and extract product details.',
      });
    } else {
      parts.push({ text: `Extract product catalog details from this dictation: "${text}"` });
    }

    let lastError = '';

    for (const model of CANDIDATE_MODELS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          lastError = errData?.error?.message || `HTTP ${res.status}`;
          console.warn(`Model ${model} failed: ${lastError}, attempting next model...`);
          continue;
        }

        const data = await res.json();
        const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (rawJson) {
          const parsed = JSON.parse(rawJson);
          return NextResponse.json({ success: true, modelUsed: model, data: parsed });
        }
      } catch (err: any) {
        lastError = err.message;
        console.warn(`Error calling ${model}:`, err.message);
      }
    }

    return NextResponse.json({ error: `AI parsing failed across candidate models: ${lastError}` }, { status: 502 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
