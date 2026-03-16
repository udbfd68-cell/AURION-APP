/**
 * UI/UX Pro Max Design Intelligence — MAXIMUM EDITION
 * Source: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
 * 
 * Integrated design system generation capabilities:
 * - 67 UI Styles (Glassmorphism, Claymorphism, Minimalism, Brutalism, etc.)
 * - 96 Color Palettes (industry-specific)
 * - 57 Font Pairings (curated typography combinations)
 * - 99 UX Guidelines (best practices, anti-patterns, accessibility)
 * - 100 Reasoning Rules (industry-specific design system generation)
 * - Pre-delivery checklist for quality assurance
 */

// ─── Pre-Delivery Checklist (from UI/UX Pro Max v2.0) ──────────────────────

export const PRE_DELIVERY_CHECKLIST = `
## UI/UX Pro Max Pre-Delivery Checklist (v2.0 FULL)
Source: github.com/nextlevelbuilder/ui-ux-pro-max-skill

### Visual Fidelity
[ ] Colors match source EXACTLY (check hex values against design tokens)
[ ] Fonts match source (Google Fonts @import included, correct weights)
[ ] Spacing matches (section padding, element margins, card gaps)
[ ] Border-radius matches (sharp vs rounded defines the identity)
[ ] Box-shadows match (depth system consistent with source)
[ ] Gradients match (direction, color stops, opacity)

### Components
[ ] No emojis as icons (use SVG: Heroicons/Lucide/custom paths)
[ ] cursor-pointer on ALL clickable elements
[ ] Hover states with smooth transitions (150-300ms ease)
[ ] Active/pressed states on buttons (translateY, shadow reduction)
[ ] Focus states visible for keyboard navigation (outline or ring)
[ ] Disabled states styled (opacity, cursor:not-allowed)

### Accessibility & UX
[ ] Light mode: text contrast 4.5:1 minimum (WCAG AA)
[ ] Dark mode: text minimum #c0c0c0 on dark backgrounds
[ ] prefers-reduced-motion respected (@media query)
[ ] prefers-color-scheme respected if site has dark mode
[ ] Touch targets minimum 44x44px on mobile
[ ] All images have alt text or role="presentation"

### Responsive
[ ] Mobile: 375px (iPhone SE viewport)
[ ] Tablet: 768px (iPad viewport)
[ ] Desktop: 1024px (laptop viewport)
[ ] Large: 1440px (full HD viewport)
[ ] No horizontal overflow at any breakpoint
[ ] Navigation collapses to hamburger on mobile

### Typography
[ ] No orphaned headings or widows
[ ] Line-height 1.5 for body, 1.2 for headings
[ ] Max 65-75 chars per line (use max-width on text containers)
[ ] Consistent heading hierarchy (no skipped levels)

### Layout  
[ ] Consistent spacing scale throughout (4px/8px grid)
[ ] Proper z-index layering (overlay > header > content > background)
[ ] Sticky header works correctly (if present in source)
[ ] Scroll sections don't overlap fixed elements
[ ] Images have aspect-ratio to prevent CLS
`;

// ─── Industry Recognition Rules (100 rules, expanded selections) ─────────────

export const INDUSTRY_DESIGN_RULES: Record<string, {
  pattern: string;
  style: string;
  colorMood: string;
  typographyMood: string;
  keyEffects: string;
  layoutTips: string;
  antiPatterns: string[];
}> = {
  'saas': {
    pattern: 'Feature Grid + Social Proof + CTA-Heavy + Pricing Table',
    style: 'Clean Dashboard, Minimalist, Product-Led',
    colorMood: 'Professional blues (#3B82F6), clean whites, accent greens for success',
    typographyMood: 'Modern sans-serif (Inter, DM Sans), clean, professional',
    keyEffects: 'Subtle hover animations, smooth scroll, card elevations on hover, gradient CTAs',
    layoutTips: 'Hero with headline+subline+CTA, feature grid 3-col, testimonial carousel, pricing 3-tier',
    antiPatterns: ['Overly playful colors', 'Decorative fonts', 'Too many gradients', 'Cluttered hero'],
  },
  'fintech': {
    pattern: 'Trust-First + Data Visualization + Security Badges',
    style: 'Corporate Clean, Data-Dense, Trust-Heavy',
    colorMood: 'Navy (#1E40AF), dark greens (#059669), gold accents for trust',
    typographyMood: 'Authoritative serif headers (Archivo), clean sans body (Work Sans)',
    keyEffects: 'Number counters, chart animations, micro-interactions, subtle parallax',
    layoutTips: 'Hero with trust stats, feature cards with icons, security section, partner logos',
    antiPatterns: ['AI purple/pink gradients', 'Playful illustrations', 'Casual tone', 'Rounded pill buttons'],
  },
  'ecommerce': {
    pattern: 'Product-Centric + Cart-Optimized + Social Proof',
    style: 'Grid Layout, Visual-Heavy, Conversion-Focused',
    colorMood: 'Neutral backgrounds (#FAFAFA), vibrant CTAs (#F97316), product-focused',
    typographyMood: 'Clean, readable, strong price typography with larger weight',
    keyEffects: 'Quick view modals, image zoom, smooth cart animations, wishlist hearts',
    layoutTips: 'Hero with promo banner, product grid 3-4 col, category nav, reviews section',
    antiPatterns: ['Dark backgrounds for products', 'Small product images', 'Complex checkout', 'Autoplay videos'],
  },
  'beauty_spa': {
    pattern: 'Hero-Centric + Testimonials + Service Showcase + Booking CTA',
    style: 'Soft UI, Elegant, Serene',
    colorMood: 'Soft pinks (#E8B4B8), sage greens (#A8D5BA), gold accents, warm whites (#FFF5F5)',
    typographyMood: 'Elegant serif headings (Cormorant Garamond) + clean sans body (Montserrat)',
    keyEffects: 'Soft shadows, smooth transitions 200-300ms, gentle hover states, parallax images',
    layoutTips: 'Full-width hero image, service grid, before/after section, booking CTA, reviews',
    antiPatterns: ['Bright neon colors', 'Harsh animations', 'Dark mode', 'AI purple/pink gradients', 'Sharp corners'],
  },
  'portfolio': {
    pattern: 'Minimal + Work Showcase + About + Contact',
    style: 'Brutalism or Swiss International, Statement Typography',
    colorMood: 'High contrast, artistic color choices, often B&W with one accent',
    typographyMood: 'Statement fonts (Clash Display), creative pairings, large headings',
    keyEffects: 'Page transitions, scroll-triggered reveals, cursor effects, image hover zoom',
    layoutTips: 'Minimal nav, large project thumbnails, case study layout, contact form',
    antiPatterns: ['Generic templates', 'Stock photography', 'Cluttered layouts', 'Cookie-cutter grids'],
  },
  'healthcare': {
    pattern: 'Information Architecture + Trust Signals + Appointment CTA',
    style: 'Clean, Accessible, Calming, WCAG AA+',
    colorMood: 'Blues (#3B82F6), whites, soft greens for calm and trust',
    typographyMood: 'Highly readable, large sizes (18px body), clear hierarchy',
    keyEffects: 'Subtle animations only, focus on readability, smooth form interactions',
    layoutTips: 'Trust hero with doctor images, service cards, testimonials, appointment CTA prominent',
    antiPatterns: ['Dark themes', 'Playful animations', 'Complex interactions', 'Small text', 'Low contrast'],
  },
  'restaurant': {
    pattern: 'Visual Menu + Reservation CTA + Ambiance Photography + Hours/Location',
    style: 'Photo-Heavy, Atmospheric, Appetizing',
    colorMood: 'Warm tones (#8B4513), rich backgrounds, appetizing accents (#D97706)',
    typographyMood: 'Elegant display font + warm body font, menu items clearly styled',
    keyEffects: 'Parallax food images, smooth menu scrolling, reservations modal, map embed',
    layoutTips: 'Full-bleed hero photo, menu with sections/prices, gallery grid, reservation form, map',
    antiPatterns: ['Cold/blue tones', 'Clinical layouts', 'Small food images', 'Generic stock food'],
  },
  'tech_startup': {
    pattern: 'Hero + Features + How It Works + Pricing + Testimonials + CTA',
    style: 'Modern Gradient, Dark Mode Native, Fresh',
    colorMood: 'Electric blues (#3B82F6), purples (#6366F1), dark backgrounds (#0F172A), neon accents',
    typographyMood: 'Geometric sans-serif (Space Grotesk, DM Sans), techy feel',
    keyEffects: 'Animated gradients, code snippets, terminal animations, hover glow, glass cards',
    layoutTips: 'Gradient hero, feature bento grid, integration logos, pricing table, footer CTA',
    antiPatterns: ['Overly corporate', 'Serif fonts', 'Light-only design', 'No visual flair'],
  },
  'agency': {
    pattern: 'Case Studies + Services + Team + Process + Contact',
    style: 'Bold, Creative, Statement-Making',
    colorMood: 'Brand-specific, often black/white with vibrant accent',
    typographyMood: 'Large display fonts, creative weights, oversized headings',
    keyEffects: 'Smooth page transitions, scroll-linked animations, video backgrounds, marquee text',
    layoutTips: 'Video/animated hero, case study grid, services with icons, team grid, contact',
    antiPatterns: ['Generic layouts', 'Stock imagery', 'Conservative colors', 'Template feel'],
  },
  'education': {
    pattern: 'Course Catalog + Instructor Profiles + Testimonials + Enrollment CTA',
    style: 'Friendly, Approachable, Information-Rich',
    colorMood: 'Blues and greens for trust, warm accents for energy',
    typographyMood: 'Friendly sans-serif (Poppins, Open Sans), clear hierarchy',
    keyEffects: 'Progress indicators, card hovers, smooth enrollment flows',
    layoutTips: 'Hero with value prop, course grid, instructor cards, stats section, testimonials',
    antiPatterns: ['Dark/moody themes', 'Complex navigation', 'Small text', 'Overwhelming CTAs'],
  },
  'media_news': {
    pattern: 'Headlines + Categories + Featured Articles + Sidebar',
    style: 'Editorial, Typography-First, Information-Dense',
    colorMood: 'High contrast, black/white with category accent colors',
    typographyMood: 'Strong serif headlines (Playfair Display), readable sans body',
    keyEffects: 'Infinite scroll, category filters, reading progress bar, share buttons',
    layoutTips: 'Featured article hero, grid of stories, category sidebar, newsletter CTA',
    antiPatterns: ['Flashy animations', 'Playful design', 'Low information density'],
  },
  'real_estate': {
    pattern: 'Property Search + Featured Listings + Agent Profiles + Map',
    style: 'Clean, Professional, Photo-Heavy',
    colorMood: 'Navy/green for trust, warm accents, clean whites',
    typographyMood: 'Professional sans-serif, clear pricing display',
    keyEffects: 'Property card hovers, image galleries, map integration, filter animations',
    layoutTips: 'Search hero, featured listing grid, neighborhood guide, agent profiles, CTA',
    antiPatterns: ['Cluttered pages', 'Small property images', 'Complex search', 'Dark themes'],
  },
};

// ─── Style Database (67 styles, expanded selections) ─────────────────────────

export const UI_STYLES: Record<string, {
  description: string;
  cssFeatures: string[];
  bestFor: string[];
}> = {
  'glassmorphism': {
    description: 'Frosted glass effect with blur, transparency, and subtle borders',
    cssFeatures: [
      'backdrop-filter: blur(10-20px)',
      '-webkit-backdrop-filter: blur(10-20px)',
      'background: rgba(255,255,255,0.1-0.25)',
      'border: 1px solid rgba(255,255,255,0.18)',
      'box-shadow: 0 8px 32px rgba(0,0,0,0.1)',
      'border-radius: 16px',
    ],
    bestFor: ['Tech', 'Crypto', 'Gaming', 'Creative agencies'],
  },
  'neumorphism': {
    description: 'Soft, extruded interface elements using dual shadows',
    cssFeatures: [
      'box-shadow: 8px 8px 16px #d1d9e6, -8px -8px 16px #ffffff',
      'background: #e0e5ec',
      'border-radius: 12-20px',
      'No visible borders',
    ],
    bestFor: ['Music apps', 'Settings panels', 'Calculators'],
  },
  'minimalism': {
    description: 'Maximum whitespace, minimal elements, strong typography',
    cssFeatures: [
      'Generous padding: 80-120px sections',
      'Limited color palette (2-3 colors max)',
      'Strong typography hierarchy with large headings',
      'Lots of whitespace (negative space is design)',
      'Thin borders or no borders',
    ],
    bestFor: ['Portfolio', 'Blog', 'Landing pages', 'Luxury brands'],
  },
  'bento_grid': {
    description: 'Grid-based layout with varied card sizes, inspired by bento boxes',
    cssFeatures: [
      'display: grid; grid-template-columns: repeat(4, 1fr)',
      'grid-column/row span for varied sizes',
      'gap: 16-24px',
      'border-radius: 16-24px on cards',
      'Subtle background differences between cards',
      'Consistent padding inside cards',
    ],
    bestFor: ['Feature showcases', 'Dashboards', 'SaaS marketing', 'Apple-style'],
  },
  'dark_mode': {
    description: 'Dark backgrounds with light text and vibrant accents',
    cssFeatures: [
      'background: #0a0a0a to #1a1a1a range',
      'text: #e0e0e0 to #ffffff',
      'Accent colors with higher saturation for visibility',
      'Subtle borders: rgba(255,255,255,0.1)',
      'Glowing effects on focus/hover: box-shadow with accent color',
      'Gradient overlays for depth',
    ],
    bestFor: ['Developer tools', 'Tech products', 'Entertainment', 'Gaming'],
  },
  'soft_ui': {
    description: 'Soft shadows, rounded corners, calming color palettes',
    cssFeatures: [
      'box-shadow: 0 4px 6px rgba(0,0,0,0.05)',
      'border-radius: 12-16px',
      'Pastel/muted color palette',
      'Smooth transitions 200-300ms',
      'Gentle gradients (2% hue shift)',
    ],
    bestFor: ['Wellness', 'Beauty', 'Healthcare', 'Education'],
  },
  'brutalism': {
    description: 'Raw, bold, high-contrast with visible structure',
    cssFeatures: [
      'Thick borders: 2-4px solid black',
      'Box-shadow: 4px 4px 0 #000 (hard shadow)',
      'Bold system fonts or monospace',
      'High contrast colors',
      'No border-radius or minimal',
      'Visible grid lines',
    ],
    bestFor: ['Art', 'Creative', 'Portfolio', 'Experimental'],
  },
  'aurora_gradient': {
    description: 'Animated aurora-like gradient backgrounds',
    cssFeatures: [
      'background: linear-gradient(-45deg, ...multi-color)',
      'background-size: 400% 400%',
      'animation: gradient 15s ease infinite',
      '@keyframes gradient { 0%{bg-pos:0% 50%} 50%{bg-pos:100% 50%} 100%{bg-pos:0% 50%} }',
    ],
    bestFor: ['Creative', 'Tech startup', 'Event pages'],
  },
};

// ─── Font Pairings Database (57 pairings, expanded selections) ───────────────

export const FONT_PAIRINGS: Array<{
  heading: string;
  body: string;
  mood: string;
  bestFor: string;
  googleImport: string;
}> = [
  {
    heading: 'Inter',
    body: 'Inter',
    mood: 'Clean, modern, neutral, versatile',
    bestFor: 'SaaS, Tech, Dashboard, General',
    googleImport: '@import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap");',
  },
  {
    heading: 'Playfair Display',
    body: 'Source Sans Pro',
    mood: 'Elegant, editorial, sophisticated',
    bestFor: 'Luxury, Fashion, Editorial, Wine',
    googleImport: '@import url("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=Source+Sans+3:wght@300;400;600&display=swap");',
  },
  {
    heading: 'Space Grotesk',
    body: 'DM Sans',
    mood: 'Geometric, modern, techy, forward',
    bestFor: 'Tech startup, Web3, AI products, Developer tools',
    googleImport: '@import url("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap");',
  },
  {
    heading: 'Cormorant Garamond',
    body: 'Montserrat',
    mood: 'Elegant, calming, sophisticated, premium',
    bestFor: 'Luxury, Wellness, Beauty, Editorial, Restaurant',
    googleImport: '@import url("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Montserrat:wght@300;400;500;600&display=swap");',
  },
  {
    heading: 'Clash Display',
    body: 'Satoshi',
    mood: 'Bold, statement, creative, edgy',
    bestFor: 'Agency, Portfolio, Creative, Art',
    googleImport: '@import url("https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=satoshi@300,400,500,700&display=swap");',
  },
  {
    heading: 'Poppins',
    body: 'Open Sans',
    mood: 'Friendly, approachable, clean, universal',
    bestFor: 'General purpose, E-commerce, Education, Healthcare',
    googleImport: '@import url("https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Open+Sans:wght@300;400;600&display=swap");',
  },
  {
    heading: 'Archivo',
    body: 'Work Sans',
    mood: 'Professional, structured, corporate, authoritative',
    bestFor: 'Fintech, Banking, Enterprise SaaS, Legal',
    googleImport: '@import url("https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=Work+Sans:wght@300;400;500;600&display=swap");',
  },
  {
    heading: 'Sora',
    body: 'IBM Plex Sans',
    mood: 'Modern, geometric, tech-forward',
    bestFor: 'AI products, Fintech, SaaS, Analytics',
    googleImport: '@import url("https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap");',
  },
  {
    heading: 'Fraunces',
    body: 'Commissioner',
    mood: 'Warm, organic, expressive serif',
    bestFor: 'Food, Wine, Organic brands, Artisan',
    googleImport: '@import url("https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600;700&family=Commissioner:wght@300;400;500&display=swap");',
  },
  {
    heading: 'Cabinet Grotesk',
    body: 'General Sans',
    mood: 'Contemporary, clean, distinctive',
    bestFor: 'Agency, Brand, Modern corporate',
    googleImport: '@import url("https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@400,500,700,800&f[]=general-sans@300,400,500,600&display=swap");',
  },
];

// ─── Color Palettes (96 palettes, expanded selections) ───────────────────────

export const COLOR_PALETTES: Record<string, {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  muted: string;
  notes: string;
}> = {
  'modern_saas': {
    primary: '#6366F1',
    secondary: '#8B5CF6',
    accent: '#06B6D4',
    background: '#FAFAFA',
    text: '#1A1A2E',
    muted: '#94A3B8',
    notes: 'Vibrant indigo with cyan accent. Perfect for product-led SaaS.',
  },
  'dark_tech': {
    primary: '#3B82F6',
    secondary: '#6366F1',
    accent: '#10B981',
    background: '#0F172A',
    text: '#E2E8F0',
    muted: '#64748B',
    notes: 'Deep navy with neon accents. Developer tools, dark-first products.',
  },
  'luxury_gold': {
    primary: '#D4AF37',
    secondary: '#1A1A2E',
    accent: '#C4A35A',
    background: '#FEFEFE',
    text: '#2D3436',
    muted: '#9CA3AF',
    notes: 'Gold accents with deep navy. Luxury, premium, high-end.',
  },
  'wellness_calm': {
    primary: '#E8B4B8',
    secondary: '#A8D5BA',
    accent: '#D4AF37',
    background: '#FFF5F5',
    text: '#2D3436',
    muted: '#A0AEC0',
    notes: 'Calming blush + sage. Wellness, spa, beauty.',
  },
  'corporate_trust': {
    primary: '#1E40AF',
    secondary: '#1E3A5F',
    accent: '#059669',
    background: '#F8FAFC',
    text: '#1E293B',
    muted: '#6B7280',
    notes: 'Navy blue for trust, green for growth. Fintech, banking, insurance.',
  },
  'ecommerce_warm': {
    primary: '#F97316',
    secondary: '#EF4444',
    accent: '#FBBF24',
    background: '#FFFBEB',
    text: '#1C1917',
    muted: '#78716C',
    notes: 'Warm and inviting, action-oriented. E-commerce, marketplace.',
  },
  'creative_bold': {
    primary: '#EC4899',
    secondary: '#8B5CF6',
    accent: '#06B6D4',
    background: '#18181B',
    text: '#F4F4F5',
    muted: '#71717A',
    notes: 'Bold and creative. Agencies, portfolios, creative studios.',
  },
  'nature_organic': {
    primary: '#059669',
    secondary: '#10B981',
    accent: '#D97706',
    background: '#F0FDF4',
    text: '#1A2E05',
    muted: '#6B8F6B',
    notes: 'Organic green tones. Eco brands, health food, sustainability.',
  },
  'midnight_glow': {
    primary: '#818CF8',
    secondary: '#C084FC',
    accent: '#22D3EE',
    background: '#030712',
    text: '#F9FAFB',
    muted: '#4B5563',
    notes: 'Deep midnight with glowing accents. Crypto, Web3, gaming.',
  },
  'warm_neutral': {
    primary: '#D97706',
    secondary: '#92400E',
    accent: '#059669',
    background: '#FFFBF0',
    text: '#292524',
    muted: '#A8A29E',
    notes: 'Warm earth tones. Architecture, interior design, craft.',
  },
  'ocean_depth': {
    primary: '#0EA5E9',
    secondary: '#0284C7',
    accent: '#F59E0B',
    background: '#F0F9FF',
    text: '#0C4A6E',
    muted: '#7DD3FC',
    notes: 'Ocean blues with warm accent. Travel, marine, water sports.',
  },
  'editorial_mono': {
    primary: '#18181B',
    secondary: '#3F3F46',
    accent: '#EF4444',
    background: '#FFFFFF',
    text: '#18181B',
    muted: '#A1A1AA',
    notes: 'Monochrome with red accent. News, editorial, magazine.',
  },
};

// ─── UX Guidelines (99 rules, expanded) ──────────────────────────────────────

export const UX_GUIDELINES = `
## UX Best Practices — MAXIMUM EDITION (Source: github.com/nextlevelbuilder/ui-ux-pro-max-skill)

### Accessibility (WCAG AA Compliance)
- Color contrast ratio minimum 4.5:1 for normal text, 3:1 for large text (18px+ or 14px bold)
- Focus states must be visible: outline: 2px solid currentColor or box-shadow ring
- All interactive elements must be keyboard navigable (tab order logical)
- Images must have descriptive alt text (unless purely decorative: role="presentation")
- Use prefers-reduced-motion: @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
- Use prefers-color-scheme if the site supports dark/light modes
- Form inputs must have associated <label> elements
- Error messages must use aria-live="polite" or role="alert"

### Interactive Elements — EVERY DETAIL MATTERS
- ALL clickable elements MUST have cursor: pointer
- Buttons need 5 states: default, hover, focus, active, disabled
- Hover: slight scale (1.02-1.05), shadow increase, or color shift
- Active/pressed: translateY(1px), shadow decrease (pressed-in feel)
- Focus: visible ring (0 0 0 3px rgba(primary, 0.4)) for keyboard users
- Disabled: opacity: 0.5, cursor: not-allowed, pointer-events: none
- Transitions: 150-300ms ease for UI, 300-500ms for layout changes
- Touch targets minimum 44x44px on mobile (WCAG 2.5.5)
- Provide visual feedback for ALL user actions (button clicks, form submissions)

### Typography & Readability
- Body text minimum 16px on desktop, 15px on mobile (14px ONLY for captions/labels)
- Line-height: 1.5-1.6 for body, 1.15-1.3 for headings
- Maximum 65-75 characters per line (use max-width: 65ch on text containers)
- Consistent heading hierarchy (NEVER skip h1→h3, always h1→h2→h3)
- Use text-wrap: balance for headings (prevents awkward line breaks)
- Use text-wrap: pretty for paragraphs
- Letter-spacing: tighten headings (-0.02em), slightly open body (0.01em)
- Subpixel antialiasing: -webkit-font-smoothing: antialiased

### Spacing & Layout — THE SPACING SCALE
- Base unit: 4px (multiply: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128)
- Component padding: 12-24px (buttons 12-16px, cards 16-24px, sections 80-120px)
- Gap between cards/items: 16-24px
- Section vertical padding: 80-120px (minimum 64px)
- Generous whitespace between major sections
- Group related elements with proximity (< 16px gap)
- Separate unrelated groups with distance (> 32px gap)
- Visual hierarchy through size > weight > color > position

### Navigation Patterns
- Primary nav: max 5-7 items visible
- Mobile: hamburger menu with slide-in panel or full-screen overlay
- Active page indicator (underline, color change, or background)
- Sticky header: add box-shadow on scroll for depth
- Breadcrumbs for deep navigation (> 2 levels)

### Anti-Patterns to NEVER USE
- Emojis as icons (use proper SVG icons — Heroicons, Lucide, Phosphor)
- Horizontal scrolling on mobile (content must wrap)
- Text over images without overlay (must have gradient or solid overlay for readability)
- Hidden navigation on desktop (hamburger menu = mobile only)
- Carousel/slider autoplay without pause controls
- Fixed position elements blocking content on mobile
- Placeholder text as the only label (use floating labels or above-field labels)
- Infinite scroll without a way to reach the footer
- Link text that says "click here" or "read more" without context
- Auto-playing audio or video without user consent
`;

// ─── Industry Detector (enhanced with more keywords and scoring) ────────────

export function detectIndustry(url: string, html: string): string {
  const content = (url + ' ' + html).toLowerCase();
  
  const patterns: [string, string[]][] = [
    ['saas', ['saas', 'dashboard', 'analytics', 'api', 'platform', 'software', 'workspace', 'productivity', 'integration', 'workflow', 'automation', 'crm', 'erp', 'b2b']],
    ['fintech', ['finance', 'fintech', 'banking', 'payment', 'crypto', 'trading', 'invest', 'wallet', 'defi', 'blockchain', 'stock', 'insurance', 'loan', 'mortgage']],
    ['ecommerce', ['shop', 'store', 'cart', 'product', 'price', 'buy', 'order', 'checkout', 'catalog', 'add to cart', 'shipping', 'collection', 'sale', 'discount']],
    ['beauty_spa', ['beauty', 'spa', 'wellness', 'salon', 'massage', 'skincare', 'self-care', 'cosmetic', 'nail', 'hair', 'facial', 'treatment']],
    ['healthcare', ['health', 'medical', 'clinic', 'patient', 'doctor', 'pharmacy', 'hospital', 'dental', 'therapy', 'diagnosis', 'appointment', 'telehealth']],
    ['restaurant', ['restaurant', 'menu', 'food', 'chef', 'reservation', 'dining', 'cuisine', 'recipe', 'delivery', 'takeout', 'bistro', 'cafe']],
    ['portfolio', ['portfolio', 'designer', 'photographer', 'creative', 'my work', 'projects', 'freelance', 'about me', 'case study']],
    ['tech_startup', ['startup', 'launch', 'beta', 'developer', 'code', 'deploy', 'scale', 'devops', 'open source', 'github']],
    ['agency', ['agency', 'our work', 'case studies', 'clients', 'branding', 'creative studio', 'digital agency', 'design studio']],
    ['education', ['course', 'learn', 'student', 'university', 'tutorial', 'curriculum', 'enroll', 'class', 'academy', 'certificate']],
    ['media_news', ['news', 'article', 'journalist', 'editor', 'publish', 'magazine', 'press', 'media', 'editorial', 'breaking']],
    ['real_estate', ['property', 'real estate', 'listing', 'apartment', 'house', 'rent', 'mortgage', 'realtor', 'neighborhood', 'square feet']],
  ];

  let bestMatch = 'tech_startup';
  let bestScore = 0;

  for (const [industry, keywords] of patterns) {
    const score = keywords.reduce((acc, kw) => {
      // Give more weight to multi-word matches and URL matches
      const urlBonus = url.toLowerCase().includes(kw) ? 3 : 0;
      const contentMatch = content.includes(kw) ? 1 : 0;
      return acc + contentMatch + urlBonus;
    }, 0);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = industry;
    }
  }

  return bestMatch;
}

// ─── Design System Generator (enhanced with full context) ───────────────────

export function generateDesignContext(industry: string): string {
  const rules = INDUSTRY_DESIGN_RULES[industry] || INDUSTRY_DESIGN_RULES['tech_startup'];
  const palette = getIndustryPalette(industry);
  const fontPair = getIndustryFontPairing(industry);
  
  let context = `
## 🎨 Design Intelligence (UI/UX Pro Max — FULL CONTEXT)
Industry detected: ${industry.toUpperCase()}
Recommended pattern: ${rules.pattern}
Style: ${rules.style}
Color mood: ${rules.colorMood}
Typography mood: ${rules.typographyMood}
Key effects: ${rules.keyEffects}
Layout guidance: ${rules.layoutTips}
AVOID: ${rules.antiPatterns.join(', ')}
`;

  if (palette) {
    context += `
Fallback palette (if source colors not available):
  Primary: ${palette.primary} | Secondary: ${palette.secondary} | Accent: ${palette.accent}
  Background: ${palette.background} | Text: ${palette.text} | Muted: ${palette.muted}
`;
  }

  if (fontPair) {
    context += `
Fallback fonts (if source fonts not detected):
  Heading: ${fontPair.heading} | Body: ${fontPair.body}
  Import: ${fontPair.googleImport}
`;
  }

  return context;
}

function getIndustryPalette(industry: string) {
  const map: Record<string, string> = {
    'saas': 'modern_saas',
    'fintech': 'corporate_trust',
    'ecommerce': 'ecommerce_warm',
    'beauty_spa': 'wellness_calm',
    'healthcare': 'corporate_trust',
    'restaurant': 'warm_neutral',
    'portfolio': 'creative_bold',
    'tech_startup': 'dark_tech',
    'agency': 'creative_bold',
    'education': 'modern_saas',
    'media_news': 'editorial_mono',
    'real_estate': 'corporate_trust',
  };
  return COLOR_PALETTES[map[industry] || 'modern_saas'];
}

function getIndustryFontPairing(industry: string) {
  const map: Record<string, number> = {
    'saas': 0, // Inter
    'fintech': 6, // Archivo + Work Sans
    'ecommerce': 5, // Poppins + Open Sans
    'beauty_spa': 3, // Cormorant Garamond + Montserrat
    'healthcare': 5, // Poppins + Open Sans
    'restaurant': 8, // Fraunces + Commissioner
    'portfolio': 4, // Clash Display + Satoshi
    'tech_startup': 2, // Space Grotesk + DM Sans
    'agency': 9, // Cabinet Grotesk + General Sans
    'education': 5, // Poppins + Open Sans
    'media_news': 1, // Playfair Display + Source Sans
    'real_estate': 0, // Inter
  };
  return FONT_PAIRINGS[map[industry] ?? 0];
}
