import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4" role="alert">
      <div className="max-w-md w-full bg-[#111] border border-[#222] rounded-xl p-8 text-center">
        <div className="text-6xl font-bold text-purple-500 mb-4">404</div>
        <h2 className="text-xl font-semibold text-white mb-2">Page not found</h2>
        <p className="text-[#888] mb-6 text-sm">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
        <Link
          href="/"
          className="inline-block px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
          aria-label="Go back home"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
