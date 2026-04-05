'use client';

import { useState, useEffect } from 'react';
import type { GalleryProject } from '@/lib/types';

// Clerk — conditional
const CLERK_ENABLED = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ClerkMod: any = {};
if (CLERK_ENABLED) { try { ClerkMod = require('@clerk/nextjs'); } catch {} } // eslint-disable-line @typescript-eslint/no-require-imports
const SignInButton: React.ComponentType<{children: React.ReactNode}> = ClerkMod.SignInButton || (({children}) => <>{children}</>);

// Demo gallery data — in production, fetch from database
const DEMO_GALLERY: GalleryProject[] = [
  {
    id: '1', name: 'SaaS Dashboard Pro', description: 'Complete analytics dashboard with charts, tables, and real-time metrics',
    thumbnail: '', author: { name: 'Aurion Team', avatar: '' }, likes: 1247, views: 8432, tags: ['SaaS', 'Dashboard', 'Analytics'],
    deployedUrl: '#', createdAt: Date.now() - 86400000 * 30,
  },
  {
    id: '2', name: 'E-Commerce Store', description: 'Modern online store with cart, checkout, and product gallery',
    thumbnail: '', author: { name: 'Community', avatar: '' }, likes: 892, views: 5621, tags: ['E-Commerce', 'Store', 'Stripe'],
    deployedUrl: '#', createdAt: Date.now() - 86400000 * 15,
  },
  {
    id: '3', name: 'Portfolio Minimal', description: 'Clean developer portfolio with project showcase and contact form',
    thumbnail: '', author: { name: 'Community', avatar: '' }, likes: 634, views: 3210, tags: ['Portfolio', 'Minimal', 'Personal'],
    deployedUrl: '#', createdAt: Date.now() - 86400000 * 7,
  },
  {
    id: '4', name: 'Blog Platform', description: 'Full-featured blog with dark mode, search, nested comments, and categories',
    thumbnail: '', author: { name: 'Aurion Team', avatar: '' }, likes: 521, views: 2890, tags: ['Blog', 'Content', 'CMS'],
    deployedUrl: '#', createdAt: Date.now() - 86400000 * 3,
  },
  {
    id: '5', name: 'AI Chat Interface', description: 'ChatGPT-like interface with streaming responses and code highlighting',
    thumbnail: '', author: { name: 'Community', avatar: '' }, likes: 1089, views: 7234, tags: ['AI', 'Chat', 'Streaming'],
    deployedUrl: '#', createdAt: Date.now() - 86400000 * 1,
  },
  {
    id: '6', name: 'Fitness Tracker', description: 'Workout tracking app with charts, goals, and progress visualization',
    thumbnail: '', author: { name: 'Community', avatar: '' }, likes: 345, views: 1876, tags: ['Health', 'Fitness', 'Charts'],
    deployedUrl: '#', createdAt: Date.now() - 86400000 * 10,
  },
];

const CATEGORIES = ['All', 'SaaS', 'E-Commerce', 'Portfolio', 'Blog', 'AI', 'Dashboard', 'Landing Page'];

export default function GalleryPage() {
  const isSignedIn = CLERK_ENABLED && (typeof document !== 'undefined' && document.cookie.includes('__session'));
  const [projects, setProjects] = useState<GalleryProject[]>(DEMO_GALLERY);
  const [category, setCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'likes' | 'views' | 'createdAt'>('likes');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = projects
    .filter(p => {
      if (category !== 'All' && !p.tags.some(t => t.toLowerCase().includes(category.toLowerCase()))) return false;
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase()) && !p.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'createdAt') return b.createdAt - a.createdAt;
      return (b[sortBy] as number) - (a[sortBy] as number);
    });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between max-w-7xl mx-auto px-6 py-6">
        <a href="/" className="flex items-center gap-3 text-xl font-bold">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-black">A</div>
          Aurion
        </a>
        <div className="flex items-center gap-4">
          <a href="/pricing" className="text-sm text-gray-400 hover:text-white transition-colors">Pricing</a>
          {isSignedIn ? (
            <a href="/" className="text-sm bg-white text-black px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors">Build</a>
          ) : (
            <SignInButton>
              <button className="text-sm bg-white text-black px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors">Sign In</button>
            </SignInButton>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div className="text-center pt-12 pb-8 px-6">
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white via-blue-200 to-cyan-400 bg-clip-text text-transparent">
          Community Gallery
        </h1>
        <p className="text-lg text-gray-400 max-w-xl mx-auto mb-8">
          Explore apps built by the community. Get inspired, fork projects, and ship faster.
        </p>

        {/* Search */}
        <div className="max-w-md mx-auto relative mb-8">
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111] border border-[#222] rounded-xl px-5 py-3 pl-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
        </div>

        {/* Categories */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                category === cat
                  ? 'bg-white text-black'
                  : 'bg-[#111] text-gray-400 border border-[#222] hover:border-[#444] hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Sort */}
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">{filtered.length} projects</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Sort by:</span>
          {(['likes', 'views', 'createdAt'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                sortBy === s ? 'bg-[#222] text-white' : 'text-gray-500 hover:text-white'
              }`}
            >
              {s === 'createdAt' ? 'Newest' : s === 'likes' ? 'Most Liked' : 'Most Viewed'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-6 pb-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(project => (
          <div
            key={project.id}
            className="group bg-[#111] border border-[#222] rounded-2xl overflow-hidden hover:border-[#444] transition-all hover:shadow-[0_0_30px_rgba(168,85,247,0.05)]"
          >
            {/* Thumbnail */}
            <div className="relative aspect-[16/10] bg-[#0a0a0a] overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-cyan-500/10 flex items-center justify-center">
                <span className="text-4xl">{project.tags[0] === 'SaaS' ? '📊' : project.tags[0] === 'E-Commerce' ? '🛒' : project.tags[0] === 'Portfolio' ? '🎨' : project.tags[0] === 'Blog' ? '📝' : project.tags[0] === 'AI' ? '🤖' : '🏋️'}</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                <a href={project.deployedUrl} className="px-3 py-1.5 bg-white text-black text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors">
                  View Live
                </a>
                <button className="px-3 py-1.5 bg-[#222] text-white text-xs font-semibold rounded-lg border border-[#333] hover:bg-[#333] transition-colors">
                  Fork
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-[10px] font-bold">
                  {project.author.name[0]}
                </div>
                <span className="text-xs text-gray-500">{project.author.name}</span>
              </div>
              <h3 className="font-bold text-base mb-1">{project.name}</h3>
              <p className="text-sm text-gray-400 mb-3 line-clamp-2">{project.description}</p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                    {project.likes.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    {project.views.toLocaleString()}
                  </span>
                </div>
                <div className="flex gap-1">
                  {project.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 bg-[#1a1a1a] text-gray-400 rounded-full border border-[#222]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="text-center pb-24">
        <div className="inline-flex flex-col items-center gap-4 p-8 bg-[#111] border border-[#222] rounded-2xl">
          <h2 className="text-xl font-bold">Build something amazing?</h2>
          <p className="text-sm text-gray-400">Share your project with the community and get featured.</p>
          <a href="/" className="px-6 py-3 bg-white text-black rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors">
            Start Building
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#222] py-8 px-6 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Aurion. All rights reserved.
      </footer>
    </div>
  );
}
