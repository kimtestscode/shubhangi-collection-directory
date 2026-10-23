/**
 * Shiprocket API Client for Shubhangi Collection.
 * Handles authentication, rate lookup / courier serviceability, order creation,
 * AWB assignment, and label / manifest retrieval.
 */

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

export interface CourierOption {
  courier_company_id: number;
  courier_name: string;
  rate: number;
  etd: string;
  rating: number;
  is_surface: boolean;
  is_air: boolean;
}

export interface ServiceabilityResult {
  pincode: string;
  recommended: CourierOption | null;
  cheapest: CourierOption | null;
  delhivery: CourierOption | null;
  available_couriers: CourierOption[];
  error?: string;
}

export async function getShiprocketToken(): Promise<string> {
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;

  if (!email || !password) {
    throw new Error('SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD must be configured in environment variables.');
  }

  // Token is valid for 10 days; reuse if valid for more than 1 hour
  if (cachedToken && Date.now() < tokenExpiresAt - 3600 * 1000) {
    return cachedToken;
  }

  const res = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Shiprocket auth failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  if (!data.token) {
    throw new Error('Shiprocket auth did not return a valid token.');
  }

  cachedToken = data.token;
  // Expire in 8 days
  tokenExpiresAt = Date.now() + 8 * 24 * 3600 * 1000;
  return cachedToken as string;
}

export function getPickupLocationName(): string {
  return process.env.SHIPROCKET_PICKUP_LOCATION || 'My Shop ';
}

/**
 * Check courier serviceability and rates for a given destination pincode from Kamothe (410209).
 */
export async function checkCourierServiceability(
  deliveryPincode: string,
  weightKg = 0.2,
  cod = 0
): Promise<ServiceabilityResult> {
  try {
    const token = await getShiprocketToken();
    const pickupPincode = '410209'; // Kamothe

    const cleanPin = deliveryPincode.replace(/\D/g, '').trim();
    if (cleanPin.length !== 6) {
      return {
        pincode: deliveryPincode,
        recommended: null,
        cheapest: null,
        delhivery: null,
        available_couriers: [],
        error: 'Invalid 6-digit destination pincode',
      };
    }

    const url = `https://apiv2.shiprocket.in/v1/external/courier/serviceability/?pickup_postcode=${pickupPincode}&delivery_postcode=${cleanPin}&weight=${weightKg}&cod=${cod}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      return {
        pincode: cleanPin,
        recommended: null,
        cheapest: null,
        delhivery: null,
        available_couriers: [],
        error: `Serviceability API returned status ${res.status}`,
      };
    }

    const json = await res.json();
    const rawCouriers: any[] = (json.data && json.data.available_courier_companies) || [];

    const available_couriers: CourierOption[] = rawCouriers.map((c) => {
      const name = String(c.courier_name || '');
      return {
        courier_company_id: Number(c.courier_company_id),
        courier_name: name,
        rate: Number(c.rate) || 0,
        etd: String(c.etd || '2-4 Days'),
        rating: Number(c.rating) || 4.0,
        is_surface: /surface/i.test(name),
        is_air: /air/i.test(name),
      };
    });

    // Sort by rate ascending (cheapest first)
    const sortedByPrice = [...available_couriers].sort((a, b) => a.rate - b.rate);
    const cheapest = sortedByPrice[0] || null;

    // Look for Delhivery Surface first, then Delhivery Air
    const delhivery =
      available_couriers.find((c) => /delhivery.*surface/i.test(c.courier_name)) ||
      available_couriers.find((c) => /delhivery/i.test(c.courier_name)) ||
      null;

    // Recommended: Delhivery Surface if available, otherwise cheapest
    const recommended = delhivery || cheapest;

    return {
      pincode: cleanPin,
      recommended,
      cheapest,
      delhivery,
      available_couriers,
    };
  } catch (err: any) {
    return {
      pincode: deliveryPincode,
      recommended: null,
      cheapest: null,
      delhivery: null,
      available_couriers: [],
      error: err.message || 'Failed to check serviceability',
    };
  }
}

export interface AdhocOrderPayload {
  order_id: string;
  order_date?: string; // YYYY-MM-DD HH:mm
  pickup_location?: string;
  customer_name: string;
  customer_address: string;
  customer_city: string;
  customer_pincode: string;
  customer_state?: string;
  customer_phone: string;
  declared_value?: number;
  weight_kg?: number;
  dimensions_cm?: { length: number; breadth: number; height: number };
}

/**
 * Creates an adhoc custom order on Shiprocket.
 */
export async function createShiprocketOrder(payload: AdhocOrderPayload) {
  const token = await getShiprocketToken();
  const pickup = payload.pickup_location || getPickupLocationName();

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const orderDate =
    payload.order_date ||
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  // Name splitting
  const parts = payload.customer_name.trim().split(/\s+/);
  const firstName = parts[0] || 'Customer';
  const lastName = parts.slice(1).join(' ') || '.';

  // Phone cleaning (10 digits)
  const phone = payload.customer_phone.replace(/\D/g, '').slice(-10);

  const price = payload.declared_value && payload.declared_value > 0 ? payload.declared_value : 299;
  const weight = payload.weight_kg || 0.2;
  const dims = payload.dimensions_cm || { length: 18, breadth: 12, height: 4 };

  const body = {
    order_id: payload.order_id,
    order_date: orderDate,
    pickup_location: pickup,
    channel_id: '',
    comment: 'Order from Shubhangi Collection Directory',
    billing_customer_name: firstName,
    billing_last_name: lastName,
    billing_address: payload.customer_address.slice(0, 190),
    billing_address_2: '',
    billing_city: payload.customer_city || 'City',
    billing_pincode: payload.customer_pincode.replace(/\D/g, '').trim(),
    billing_state: payload.customer_state || 'Maharashtra',
    billing_country: 'India',
    billing_email: 'support@shubhangicollection.in',
    billing_phone: phone,
    shipping_is_billing: true,
    order_items: [
      {
        name: 'Imitation Jewelry',
        sku: `IJ-${payload.order_id}`,
        units: 1,
        selling_price: price,
        discount: 0,
        tax: 0,
        hsn: '7117',
      },
    ],
    payment_method: 'Prepaid',
    sub_total: price,
    length: dims.length,
    breadth: dims.breadth,
    height: dims.height,
    weight,
  };

  const res = await fetch('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok || json.status_code >= 400) {
    const msg = json.message || JSON.stringify(json);
    throw new Error(`Failed to create order on Shiprocket: ${msg}`);
  }

  return json;
}

/**
 * Assign courier and generate AWB for a shipment.
 */
export async function assignShiprocketAWB(shipmentId: number, courierCompanyId?: number) {
  const token = await getShiprocketToken();

  const body: any = { shipment_id: shipmentId };
  if (courierCompanyId) {
    body.courier_id = courierCompanyId;
  }

  const res = await fetch('https://apiv2.shiprocket.in/v1/external/courier/assign/awb', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok || json.status_code >= 400 || (json.response && json.response.data && json.response.data.awb_assign_error)) {
    const err =
      (json.response && json.response.data && json.response.data.awb_assign_error) ||
      json.message ||
      JSON.stringify(json);
    throw new Error(`AWB Assignment failed: ${err}`);
  }

  return json.response?.data || json;
}

/**
 * Generate PDF shipping label for one or multiple shipments.
 */
export async function generateShiprocketLabel(shipmentIds: number[]) {
  const token = await getShiprocketToken();

  const res = await fetch('https://apiv2.shiprocket.in/v1/external/courier/generate/label', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ shipment_id: shipmentIds }),
  });

  const json = await res.json();
  if (!res.ok || !json.label_url) {
    throw new Error(`Failed to generate label: ${json.message || JSON.stringify(json)}`);
  }

  return json.label_url as string;
}
