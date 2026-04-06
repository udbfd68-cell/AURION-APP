// @ts-nocheck
/* ════════════════════════════════════════════
   Stripe Webhook — Handle Subscription Events
   ════════════════════════════════════════════ */
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';

/* ─── Supabase helper (direct REST, no SDK needed on edge) ─── */
async function supabaseAdmin(path: string, method: string, body?: unknown) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const res = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res.ok ? res.json() : null;
}

async function upsertSubscription(clerkUserId: string, data: Record<string, unknown>) {
  // Try update first, then insert
  const existing = await supabaseAdmin(
    `subscriptions?clerk_user_id=eq.${encodeURIComponent(clerkUserId)}&select=id`,
    'GET'
  );
  if (Array.isArray(existing) && existing.length > 0) {
    await supabaseAdmin(
      `subscriptions?clerk_user_id=eq.${encodeURIComponent(clerkUserId)}`,
      'PATCH',
      { ...data, updated_at: new Date().toISOString() }
    );
  } else {
    await supabaseAdmin('subscriptions', 'POST', {
      clerk_user_id: clerkUserId,
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
}

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2025-12-18.acacia' as Stripe.LatestApiVersion });

  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const clerkUserId = session.metadata?.clerkUserId;
        if (clerkUserId) {
          const subscription = session.subscription
            ? await stripe.subscriptions.retrieve(session.subscription as string) as Stripe.Subscription
            : null;
          await upsertSubscription(clerkUserId, {
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            status: subscription?.status || 'active',
            plan: subscription?.items?.data?.[0]?.price?.lookup_key || 'pro',
            current_period_end: subscription?.current_period_end
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : null,
          });
          console.log(`User ${clerkUserId} subscribed successfully`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const clerkUserId = subscription.metadata?.clerkUserId;
        if (clerkUserId) {
          await upsertSubscription(clerkUserId, {
            status: subscription.status,
            plan: subscription.items?.data?.[0]?.price?.lookup_key || 'pro',
            current_period_end: subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : null,
          });
          console.log(`User ${clerkUserId} subscription updated: ${subscription.status}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const clerkUserId = subscription.metadata?.clerkUserId;
        if (clerkUserId) {
          await upsertSubscription(clerkUserId, {
            status: 'canceled',
            plan: 'free',
          });
          console.log(`User ${clerkUserId} subscription cancelled → downgraded to free`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const clerkUserId = (invoice.metadata as Record<string, string>)?.clerkUserId;
        if (clerkUserId) {
          await upsertSubscription(clerkUserId, {
            status: 'past_due',
          });
          console.log(`Payment failed for user ${clerkUserId} → marked past_due`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
