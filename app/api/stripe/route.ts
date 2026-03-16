/**
 * Stripe Proxy Route — Execute real Stripe API calls
 * 
 * Proxies requests to the Stripe REST API using the user's secret key.
 * No packages needed — pure fetch against api.stripe.com.
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const STRIPE_API = 'https://api.stripe.com/v1';

// Allowed Stripe endpoints (whitelist to prevent abuse)
const ALLOWED_ENDPOINTS = [
  'balance',
  'products',
  'prices',
  'customers',
  'charges',
  'payment_intents',
  'checkout/sessions',
  'subscriptions',
  'invoices',
];

export async function POST(req: NextRequest) {
  try {
    const { stripeKey, endpoint, method, params } = await req.json();

    if (!stripeKey) {
      return NextResponse.json({ error: 'Missing stripeKey' }, { status: 400 });
    }

    // Validate key format
    if (!stripeKey.startsWith('sk_test_') && !stripeKey.startsWith('sk_live_') && !stripeKey.startsWith('rk_test_') && !stripeKey.startsWith('rk_live_')) {
      return NextResponse.json({ error: 'Invalid Stripe key format. Must start with sk_test_, sk_live_, rk_test_, or rk_live_' }, { status: 400 });
    }

    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
    }

    // Whitelist check
    const baseEndpoint = endpoint.split('/')[0];
    if (!ALLOWED_ENDPOINTS.includes(baseEndpoint)) {
      return NextResponse.json({ 
        error: `Endpoint "${baseEndpoint}" not allowed. Allowed: ${ALLOWED_ENDPOINTS.join(', ')}` 
      }, { status: 400 });
    }

    const fetchMethod = (method || 'GET').toUpperCase();
    const url = `${STRIPE_API}/${endpoint}`;

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${stripeKey}`,
    };

    const fetchOptions: RequestInit = {
      method: fetchMethod,
      headers,
    };

    // Stripe uses form-urlencoded for POST/PATCH
    if ((fetchMethod === 'POST' || fetchMethod === 'PATCH') && params) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      const formData = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          formData.append(key, String(value));
        }
      }
      fetchOptions.body = formData.toString();
    }

    const resp = await fetch(url, fetchOptions);
    const data = await resp.json().catch(() => null);

    if (!resp.ok) {
      return NextResponse.json({ 
        error: `Stripe error ${resp.status}`,
        details: data?.error || data
      }, { status: resp.status });
    }

    return NextResponse.json({ data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
