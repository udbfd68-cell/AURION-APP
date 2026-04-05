/* ════════════════════════════════════════════
   Auth Middleware — Conditional Clerk
   ════════════════════════════════════════════
   Only activates when CLERK_SECRET_KEY is set.
   Without it, all routes pass through freely.
   ════════════════════════════════════════════ */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default async function middleware(request: NextRequest) {
  // Skip Clerk entirely when keys are not configured
  if (!process.env.CLERK_SECRET_KEY || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return NextResponse.next();
  }

  // Dynamically import Clerk only when keys are present
  const { clerkMiddleware, createRouteMatcher } = await import('@clerk/nextjs/server');

  const isPublicRoute = createRouteMatcher([
    '/',
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/pricing(.*)',
    '/gallery(.*)',
    '/api/(.*)',
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return clerkMiddleware(async (auth, req) => {
    if (!isPublicRoute(req)) {
      await auth.protect();
    }
  })(request, {} as any);
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
