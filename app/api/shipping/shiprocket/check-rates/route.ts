import { NextRequest, NextResponse } from 'next/server';
import { checkCourierServiceability } from '@/lib/shiprocket';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orders: Array<{
      order_number: string;
      customer_pincode: string;
      weight_kg?: number;
    }> = body.orders || [];

    if (!Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json({ error: 'No orders provided.' }, { status: 400 });
    }

    // Limit batch size to 30 to prevent timeout
    const batch = orders.slice(0, 30);

    // Cache serviceability by pincode to avoid redundant API calls for duplicate pincodes in the same batch
    const pincodeCache = new Map<string, any>();

    const results = await Promise.all(
      batch.map(async (item) => {
        const pin = String(item.customer_pincode || '').replace(/\D/g, '').trim();
        const weight = item.weight_kg || 0.2;

        if (!pin || pin.length !== 6) {
          return {
            order_number: item.order_number,
            pincode: pin,
            error: 'Missing or invalid 6-digit destination pincode',
            available_couriers: [],
            selected_courier: null,
          };
        }

        const cacheKey = `${pin}_${weight}`;
        let res = pincodeCache.get(cacheKey);

        if (!res) {
          res = await checkCourierServiceability(pin, weight);
          pincodeCache.set(cacheKey, res);
        }

        return {
          order_number: item.order_number,
          pincode: pin,
          recommended: res.recommended,
          cheapest: res.cheapest,
          delhivery: res.delhivery,
          available_couriers: res.available_couriers || [],
          selected_courier: res.recommended, // default selection
          error: res.error,
        };
      })
    );

    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    console.error('Shiprocket check-rates error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to check courier rates' },
      { status: 500 }
    );
  }
}
