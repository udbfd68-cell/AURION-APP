'use client';

import { useState } from 'react';
import { PRICING_PLANS } from '@/lib/constants';

// Clerk — conditional
const CLERK_ENABLED = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ClerkMod: any = {};
if (CLERK_ENABLED) { try { ClerkMod = require('@clerk/nextjs'); } catch {} } // eslint-disable-line @typescript-eslint/no-require-imports
const SignInButton: React.ComponentType<{children: React.ReactNode}> = ClerkMod.SignInButton || (({children}) => <>{children}</>);

export default function PricingPage() {
  const isSignedIn = CLERK_ENABLED && (typeof document !== 'undefined' && document.cookie.includes('__session'));
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const [loading, setLoading] = useState<string | null>(null);

  async function handleSubscribe(planId: string, priceId?: string) {
    if (!priceId || planId === 'free' || planId === 'enterprise') return;

    setLoading(planId);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          userId: undefined,
          email: undefined,
        }),
      });

      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (err) {
      console.error('Checkout error:', err);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <nav className="flex items-center justify-between max-w-6xl mx-auto px-6 py-6">
        <a href="/" className="flex items-center gap-3 text-xl font-bold">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-black">A</div>
          Aurion
        </a>
        <div className="flex items-center gap-4">
          <a href="/gallery" className="text-sm text-gray-400 hover:text-white transition-colors">Gallery</a>
          {isSignedIn ? (
            <a href="/" className="text-sm bg-white text-black px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors">Dashboard</a>
          ) : (
            <SignInButton>
              <button className="text-sm bg-white text-black px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors">Sign In</button>
            </SignInButton>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div className="text-center pt-16 pb-12 px-6">
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent">
          Plans & Pricing
        </h1>
        <p className="text-lg text-gray-400 max-w-xl mx-auto mb-8">
          Start building for free. Upgrade to unlock unlimited AI power, team collaboration, and enterprise features.
        </p>

        {/* Billing Toggle */}
        <div className="inline-flex items-center bg-[#111] border border-[#222] rounded-full p-1">
          <button
            onClick={() => setBillingInterval('month')}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              billingInterval === 'month' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingInterval('year')}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              billingInterval === 'year' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            Yearly <span className="text-green-400 text-xs ml-1">Save 20%</span>
          </button>
        </div>
      </div>

      {/* Pricing Grid */}
      <div className="max-w-6xl mx-auto px-6 pb-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PRICING_PLANS.map((plan) => {
          const price = plan.price === -1 ? null : billingInterval === 'year' ? Math.round(plan.price * 0.8) : plan.price;
          const isCurrentPlan = false; // TODO: Check against user's plan

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border p-6 transition-all hover:border-[#444] ${
                plan.popular
                  ? 'border-purple-500/50 bg-gradient-to-b from-purple-500/5 to-transparent shadow-[0_0_30px_rgba(168,85,247,0.1)]'
                  : 'border-[#222] bg-[#111]'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-purple-500 text-white text-xs font-bold rounded-full">
                  MOST POPULAR
                </div>
              )}

              <h3 className="text-lg font-bold mb-1">{plan.name}</h3>

              <div className="mb-6">
                {price !== null ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black">${price}</span>
                    <span className="text-gray-500 text-sm">/{billingInterval === 'year' ? 'mo' : 'month'}</span>
                  </div>
                ) : (
                  <div className="text-4xl font-black">Custom</div>
                )}
                {plan.credits > 0 && (
                  <p className="text-xs text-gray-500 mt-1">{plan.credits.toLocaleString()} credits/month</p>
                )}
              </div>

              <ul className="flex-1 space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <svg className="w-4 h-4 text-green-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              {isSignedIn ? (
                <button
                  onClick={() => handleSubscribe(plan.id, plan.stripePriceId)}
                  disabled={loading === plan.id || isCurrentPlan || plan.id === 'enterprise'}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                    plan.popular
                      ? 'bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50'
                      : plan.id === 'enterprise'
                        ? 'bg-[#1a1a1a] text-white border border-[#333] hover:border-[#555]'
                        : 'bg-white text-black hover:bg-gray-200 disabled:opacity-50'
                  }`}
                >
                  {loading === plan.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Processing...
                    </span>
                  ) : isCurrentPlan ? 'Current Plan' : plan.cta}
                </button>
              ) : (
                <SignInButton>
                  <button className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                    plan.popular
                      ? 'bg-purple-500 text-white hover:bg-purple-600'
                      : 'bg-white text-black hover:bg-gray-200'
                  }`}>
                    Sign up to start
                  </button>
                </SignInButton>
              )}
            </div>
          );
        })}
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto px-6 pb-24">
        <h2 className="text-2xl font-bold text-center mb-8">Frequently asked questions</h2>
        <div className="space-y-4">
          {[
            { q: 'What is a credit?', a: 'A credit equals one AI message exchange. Each message you send to the AI and its response consumes one credit.' },
            { q: 'Can I change my plan later?', a: 'Yes, you can upgrade or downgrade at any time. Changes take effect immediately, and billing is prorated.' },
            { q: 'Do unused credits roll over?', a: 'Pro and Business plans include credit rollover. Unused credits carry over to the next month (up to 2x your monthly allowance).' },
            { q: 'Who owns the code?', a: 'You do. All code generated through Aurion belongs to you. Export, deploy, and use it however you want.' },
            { q: 'Is there a free trial?', a: "The Free plan is free forever with 50 messages/month. No credit card required to start." },
          ].map((faq, i) => (
            <details key={i} className="group border border-[#222] rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-sm font-medium hover:bg-[#111] transition-colors">
                {faq.q}
                <svg className="w-4 h-4 text-gray-500 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-5 pb-4 text-sm text-gray-400">{faq.a}</div>
            </details>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#222] py-8 px-6 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Aurion. All rights reserved.
      </footer>
    </div>
  );
}
