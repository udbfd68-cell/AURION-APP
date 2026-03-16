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
[ ] Background patterns/textures replicated
[ ] Line separators and dividers match style and color
[ ] Overlay effects match (gradient overlays on images, blur effects)

### Components
[ ] No emojis as icons (use SVG: Heroicons/Lucide/custom paths or Font Awesome)
[ ] cursor-pointer on ALL clickable elements
[ ] Hover states with smooth transitions (150-300ms ease)
[ ] Active/pressed states on buttons (translateY, shadow reduction)
[ ] Focus states visible for keyboard navigation (outline or ring)
[ ] Disabled states styled (opacity, cursor:not-allowed)
[ ] Cards have consistent border, shadow, padding, border-radius
[ ] Buttons are properly sized (min-height: 44px, padding: 12px 24px+)
[ ] Input fields styled consistently (border, focus state, error state)
[ ] Dropdown menus styled and functional
[ ] Modals have backdrop overlay and close button

### Content Completeness
[ ] ALL navigation items from source are present
[ ] Hero section complete with headline, subtitle, CTA
[ ] ALL content sections from source are replicated
[ ] Footer with all columns, links, social icons, copyright
[ ] No placeholder text — all content is real from source
[ ] No "lorem ipsum" — actual text from HTML scrape
[ ] All stats/numbers displayed accurately
[ ] Testimonials with name, title, company, quote
[ ] Pricing plans with all features listed

### Accessibility & UX
[ ] Light mode: text contrast 4.5:1 minimum (WCAG AA)
[ ] Dark mode: text minimum #c0c0c0 on dark backgrounds
[ ] prefers-reduced-motion respected (@media query)
[ ] prefers-color-scheme respected if site has dark mode
[ ] Touch targets minimum 44x44px on mobile
[ ] All images have alt text or role="presentation"
[ ] Proper ARIA labels on buttons, nav, and interactive elements
[ ] Skip navigation link (optional but recommended)
[ ] Form labels properly associated with inputs
[ ] Error messages accessible (aria-live or role="alert")

### Responsive
[ ] Mobile: 375px (iPhone SE viewport)
[ ] Tablet: 768px (iPad viewport)
[ ] Desktop: 1024px (laptop viewport)
[ ] Large: 1440px (full HD viewport)
[ ] No horizontal overflow at any breakpoint
[ ] Navigation collapses to hamburger on mobile
[ ] Images scale properly (max-width: 100%)
[ ] Text remains readable at all sizes
[ ] Touch targets are large enough on mobile
[ ] Sticky header works at all breakpoints

### Typography
[ ] No orphaned headings or widows
[ ] Line-height 1.5 for body, 1.2 for headings
[ ] Max 65-75 chars per line (use max-width on text containers)
[ ] Consistent heading hierarchy (no skipped levels)
[ ] Font imports loaded (Google Fonts or custom)
[ ] Font weights match source exactly
[ ] Letter-spacing matches source

### Layout  
[ ] Consistent spacing scale throughout (4px/8px grid)
[ ] Proper z-index layering (overlay > header > content > background)
[ ] Sticky header works correctly (if present in source)
[ ] Scroll sections don't overlap fixed elements
[ ] Images have aspect-ratio to prevent CLS
[ ] Container max-width consistent
[ ] Grid/flex layouts responsive
[ ] No content hidden behind fixed elements

### Interactivity
[ ] Smooth scroll between sections
[ ] Mobile hamburger menu opens/closes with animation
[ ] Dropdown menus toggle on click
[ ] Hover effects on all interactive elements
[ ] Focus styles visible on tab navigation
[ ] Back-to-top button (if source has one)
[ ] Tab switching works (if source has tabs)
[ ] Accordion expand/collapse works (if source has FAQ)
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
    keyEffects: 'Blur-fade section entrances, magnetic hover cards, shine-border on featured pricing, glow buttons for CTAs, stagger reveal for feature grid, marquee for client logos, text shimmer for key metrics',
    layoutTips: 'Hero with blur-fade entrance, feature grid 3-col with magnetic hover cards, marquee client logos, shine-border featured pricing tier, glow-btn primary CTAs',
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
    keyEffects: 'Text reveal on scroll for headings, blur-fade project entrances, magnetic hover on project cards, spotlight beam on featured work, gradient-border contact section, stagger reveal for project grid',
    layoutTips: 'Minimal nav, text-reveal hero heading, large project thumbnails with magnetic hover, blur-fade case studies, gradient-border contact form',
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
    keyEffects: 'Aurora gradient bg, spotlight beam, text shimmer headlines, blur-fade entrances, bento grid with hover glow, glow buttons, glass-premium navbar, stagger reveal features, shine-border pricing, marquee partner logos',
    layoutTips: 'Aurora hero with glass navbar, feature bento grid (3-col with span-2 highlight), marquee partner logos, stagger-reveal pricing cards, footer with gradient border CTA',
    antiPatterns: ['Overly corporate', 'Serif fonts', 'Light-only design', 'No visual flair'],
  },
  'agency': {
    pattern: 'Case Studies + Services + Team + Process + Contact',
    style: 'Bold, Creative, Statement-Making',
    colorMood: 'Brand-specific, often black/white with vibrant accent',
    typographyMood: 'Large display fonts, creative weights, oversized headings',
    keyEffects: 'Aurora gradient hero, text reveal on scroll headings, spotlight beam on case studies, blur-fade entrances, magnetic hover cards, marquee client logos, glass-premium overlays, glow buttons',
    layoutTips: 'Aurora hero with text-reveal heading, bento case study grid with magnetic hover, marquee client logos, stagger-reveal services, glass-premium contact section',
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
  'gaming': {
    pattern: 'Hero Video + Features + Community + Download CTA + Leaderboards',
    style: 'Dark, Immersive, High-Energy, Cinematic',
    colorMood: 'Dark backgrounds (#0D0D0D), neon accents (cyan, magenta, gold), high contrast',
    typographyMood: 'Bold condensed fonts (Rajdhani, Orbitron), uppercase, tight letter-spacing',
    keyEffects: 'Aurora gradient hero, floating particles bg, text shimmer titles, glow buttons with neon, glass-premium cards, spotlight beam on features, stagger reveal, typewriter effect for stats',
    layoutTips: 'Aurora hero with floating particles, glass-premium feature cards, glow-btn downloads, marquee partner/platform logos, bento feature grid',
    antiPatterns: ['Light/pastel themes', 'Serif fonts', 'Minimal design', 'Corporate feel'],
  },
  'nonprofit': {
    pattern: 'Impact Story + Mission + Donate CTA + Volunteer + Testimonials',
    style: 'Warm, Trustworthy, Emotional, Human',
    colorMood: 'Warm neutrals with vibrant impact color (orange, green, or blue)',
    typographyMood: 'Friendly, warm, readable — body 18px minimum',
    keyEffects: 'Number counters for impact stats, photo galleries, video testimonials',
    layoutTips: 'Emotional hero image/video, impact stats, mission section, donate CTA prominent, stories',
    antiPatterns: ['Overly corporate', 'Dark themes', 'Complex navigation', 'Small text'],
  },
  'legal': {
    pattern: 'Practice Areas + Attorney Profiles + Case Results + Consultation CTA',
    style: 'Professional, Authoritative, Conservative, Trustworthy',
    colorMood: 'Deep navy (#1B2A4A), burgundy accents, gold highlights, cream backgrounds',
    typographyMood: 'Authoritative serif headings + clean sans body, formal tone',
    keyEffects: 'Subtle hover states, smooth accordion for FAQ, restrained animation',
    layoutTips: 'Trust-first hero, practice area grid, attorney cards, testimonials, consultation CTA',
    antiPatterns: ['Bright colors', 'Playful design', 'Animations', 'Casual typography'],
  },
  'travel': {
    pattern: 'Destination Showcase + Search + Itineraries + Reviews + Booking CTA',
    style: 'Photo-Heavy, Wanderlust, Aspirational, Expansive',
    colorMood: 'Ocean blues and sunset oranges, clean whites, nature greens',
    typographyMood: 'Clean modern sans + elegant serif for headings, wanderlust mood',
    keyEffects: 'Full-bleed images, parallax scrolling, hover reveals, map interactions',
    layoutTips: 'Full-width hero, destination grid, itinerary timeline, review cards, booking CTA',
    antiPatterns: ['Dark themes', 'Monochrome', 'Corporate layouts', 'Small images'],
  },
  'fitness': {
    pattern: 'Hero + Classes + Trainers + Pricing + Schedule + Join CTA',
    style: 'Bold, Energetic, Dark Mode, Action-Oriented',
    colorMood: 'Dark backgrounds, neon accents (lime #84CC16, orange #FB923C), high energy',
    typographyMood: 'Extra-bold condensed sans-serif, uppercase headings, impactful',
    keyEffects: 'Video backgrounds, strong hover states, counter animations, scroll reveals',
    layoutTips: 'Action hero with video/image, class grid, trainer cards, pricing table, schedule',
    antiPatterns: ['Pastel colors', 'Serif fonts', 'Delicate design', 'Minimal layouts'],
  },
  'music_entertainment': {
    pattern: 'Featured Content + Releases + Events + Artist Bio + Stream CTA',
    style: 'Dark, Atmospheric, Visual-Heavy, Immersive',
    colorMood: 'Dark backgrounds with vibrant accent (#8B5CF6 purple, #EC4899 pink)',
    typographyMood: 'Display fonts, creative pairings, large and expressive',
    keyEffects: 'Audio player integration, visualizer animations, parallax images, hover reveals',
    layoutTips: 'Full-screen hero, latest releases grid, upcoming events, about section, merch',
    antiPatterns: ['Corporate blue', 'Conservative design', 'Light themes', 'Generic layouts'],
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
  'claymorphism': {
    description: 'Soft, clay-like 3D raised surfaces with pastel colors and thick inner shadows',
    cssFeatures: [
      'border-radius: 24-50px',
      'background: pastel color (e.g. #E8D5B7)',
      'box-shadow: 8px 8px 16px rgba(0,0,0,0.15), inset -6px -6px 12px rgba(0,0,0,0.05), inset 6px 6px 12px rgba(255,255,255,0.5)',
      'Thick, rounded shapes',
    ],
    bestFor: ['Kids', 'Playful apps', 'Creative portfolios', 'Games'],
  },
  'retro_pixel': {
    description: 'Pixel art inspired design with chunky borders, pixelated fonts, and vibrant colors',
    cssFeatures: [
      'font-family: monospace or pixel fonts',
      'border: 3px solid #000',
      'box-shadow: 4px 4px 0 #000',
      'No border-radius (sharp corners)',
      'image-rendering: pixelated',
      'Bright, saturated colors',
    ],
    bestFor: ['Gaming', 'Indie projects', 'Nostalgia', 'Creative portfolios'],
  },
  'gradient_mesh': {
    description: 'Multi-layered gradient backgrounds creating fluid, organic color transitions',
    cssFeatures: [
      'Multiple radial-gradient layers stacked',
      'background-blend-mode: overlay, multiply',
      'Large, soft gradients (200-400% size)',
      'Subtle animation for movement effect',
      'Low-opacity gradient layers for depth',
    ],
    bestFor: ['Creative agencies', 'Art', 'Music', 'Fashion'],
  },
  'swiss_international': {
    description: 'Grid-based, typography-focused design inspired by Swiss/International Typographic Style',
    cssFeatures: [
      'Strict grid system (12-column or modular)',
      'Strong typography hierarchy',
      'High contrast: black on white or minimal color',
      'Large text, generous whitespace',
      'Left-aligned or centered text',
      'Sans-serif fonts (Helvetica, Arial, Inter)',
    ],
    bestFor: ['Editorial', 'Portfolio', 'Architecture', 'Design studios'],
  },
  'neon_cyberpunk': {
    description: 'Dark backgrounds with glowing neon colors, cyberpunk aesthetic',
    cssFeatures: [
      'background: #0a0a0a or very dark purple/blue',
      'text-shadow: 0 0 10px color, 0 0 20px color, 0 0 40px color',
      'box-shadow: 0 0 15px rgba(neon-color, 0.5)',
      'border: 1px solid with glow effect',
      'Animated flicker or pulse effects',
      'Monospace or condensed fonts',
    ],
    bestFor: ['Gaming', 'Music events', 'Nightlife', 'Tech/crypto'],
  },
  'editorial_magazine': {
    description: 'Magazine-style layouts with mixed column widths, pull quotes, and strong typography',
    cssFeatures: [
      'CSS Grid for complex multi-column layouts',
      'Pull quotes with large italic text',
      'Drop caps (::first-letter pseudo-element)',
      'Mixed image sizes and text flow',
      'Thin column dividers (1px borders)',
      'Strong serif + sans-serif pairing',
    ],
    bestFor: ['News', 'Blog', 'Magazine', 'Editorial', 'Publishing'],
  },
  'corporate_clean': {
    description: 'Professional, trustworthy design with structured grids and conservative palette',
    cssFeatures: [
      'max-width: 1200px container',
      'Cards with subtle shadows and borders',
      'Conservative color palette (blue, navy, gray)',
      'Clear visual hierarchy with consistent spacing',
      'Professional sans-serif fonts',
      'Structured 3-4 column grids',
    ],
    bestFor: ['Enterprise', 'Fintech', 'Insurance', 'Legal', 'B2B SaaS'],
  },
  'organic_flowing': {
    description: 'Nature-inspired design with curved lines, flowing shapes, and earth tones',
    cssFeatures: [
      'border-radius: 40% 60% variations (blob shapes)',
      'Curved section dividers (SVG or clip-path)',
      'Earth tone palette (greens, browns, creams)',
      'Organic SVG shapes as background elements',
      'Flowing text around images',
      'Serif or handwritten-inspired fonts',
    ],
    bestFor: ['Organic brands', 'Wellness', 'Environmental', 'Food & drink'],
  },
  'monochrome_bold': {
    description: 'Strictly black and white with maximum contrast and bold typography',
    cssFeatures: [
      'Colors: only #000, #fff, and 2-3 grays',
      'Extra bold fonts (800-900 weight)',
      'Large headings (3-5rem)',
      'Strong borders: 2-4px solid black',
      'Minimal decoration, maximum content',
      'High-contrast hover states (invert colors)',
    ],
    bestFor: ['Architecture', 'Design studio', 'Fashion', 'Portfolio'],
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
  {
    heading: 'Plus Jakarta Sans',
    body: 'Plus Jakarta Sans',
    mood: 'Modern, geometric, versatile, premium SaaS',
    bestFor: 'SaaS, Fintech, Modern corporate, Dashboards',
    googleImport: '@import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap");',
  },
  {
    heading: 'Outfit',
    body: 'Outfit',
    mood: 'Geometric, clean, modern, friendly',
    bestFor: 'Tech startup, SaaS, Modern brands, Apps',
    googleImport: '@import url("https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap");',
  },
  {
    heading: 'Bricolage Grotesque',
    body: 'Inter',
    mood: 'Retro-modern, distinctive, characterful',
    bestFor: 'Creative agency, Portfolio, Brand, Editorial',
    googleImport: '@import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600&display=swap");',
  },
  {
    heading: 'Manrope',
    body: 'Manrope',
    mood: 'Clean, modern, professional, neutral',
    bestFor: 'SaaS, Tech, Corporate, Enterprise',
    googleImport: '@import url("https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap");',
  },
  {
    heading: 'Unbounded',
    body: 'DM Sans',
    mood: 'Bold, futuristic, statement, tech-forward',
    bestFor: 'Web3, Crypto, Gaming, Tech startup',
    googleImport: '@import url("https://fonts.googleapis.com/css2?family=Unbounded:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap");',
  },
  {
    heading: 'Lora',
    body: 'Nunito Sans',
    mood: 'Elegant serif with modern body, warm, refined',
    bestFor: 'Wine, Food, Hospitality, Luxury, Editorial',
    googleImport: '@import url("https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=Nunito+Sans:wght@300;400;600;700&display=swap");',
  },
  {
    heading: 'Lexend',
    body: 'Lexend',
    mood: 'Highly readable, scientific, accessible, modern',
    bestFor: 'Education, Healthcare, Accessibility-first, Government',
    googleImport: '@import url("https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&display=swap");',
  },
  {
    heading: 'Josefin Sans',
    body: 'Lato',
    mood: 'Elegant, geometric, vintage-modern, light',
    bestFor: 'Fashion, Beauty, Lifestyle, Events',
    googleImport: '@import url("https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@300;400;500;600;700&family=Lato:wght@300;400;700&display=swap");',
  },
  {
    heading: 'Raleway',
    body: 'Roboto',
    mood: 'Elegant, thin, modern, versatile',
    bestFor: 'Photography, Fashion, Portfolio, Landing pages',
    googleImport: '@import url("https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;500;600;700;800&family=Roboto:wght@300;400;500;700&display=swap");',
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
  'sunset_gradient': {
    primary: '#F97316',
    secondary: '#EC4899',
    accent: '#FBBF24',
    background: '#FFFBEB',
    text: '#1C1917',
    muted: '#A8A29E',
    notes: 'Warm sunset tones. Lifestyle, travel, events, social.',
  },
  'arctic_frost': {
    primary: '#06B6D4',
    secondary: '#0891B2',
    accent: '#F0ABFC',
    background: '#F0F9FF',
    text: '#164E63',
    muted: '#67E8F9',
    notes: 'Cool, icy blue tones. Clean-tech, environmental, data.',
  },
  'royal_purple': {
    primary: '#7C3AED',
    secondary: '#6D28D9',
    accent: '#F59E0B',
    background: '#FAF5FF',
    text: '#4C1D95',
    muted: '#C4B5FD',
    notes: 'Rich purple with gold accent. Crypto, Web3, premium SaaS.',
  },
  'forest_green': {
    primary: '#166534',
    secondary: '#15803D',
    accent: '#CA8A04',
    background: '#F0FDF4',
    text: '#14532D',
    muted: '#86EFAC',
    notes: 'Deep forest tones. Sustainability, outdoor, organic.',
  },
  'neon_dark': {
    primary: '#00FF88',
    secondary: '#FF006E',
    accent: '#00D4FF',
    background: '#0A0A0A',
    text: '#F0F0F0',
    muted: '#404040',
    notes: 'Dark with neon accents. Gaming, music, nightlife.',
  },
  'pastel_dream': {
    primary: '#C084FC',
    secondary: '#FB923C',
    accent: '#67E8F9',
    background: '#FDF4FF',
    text: '#581C87',
    muted: '#E9D5FF',
    notes: 'Soft pastels. Kids, education, wellness, creative.',
  },
  'industrial_steel': {
    primary: '#6B7280',
    secondary: '#374151',
    accent: '#F59E0B',
    background: '#F3F4F6',
    text: '#111827',
    muted: '#9CA3AF',
    notes: 'Steel gray with amber accent. Manufacturing, engineering, construction.',
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
- Skip navigation link: first focusable element should be "Skip to main content"
- ARIA landmarks: role="banner", role="navigation", role="main", role="contentinfo"
- aria-expanded on toggle buttons (hamburger, accordion, dropdown)
- aria-current="page" on active navigation link
- Ensure all content is accessible by keyboard alone (Tab, Shift+Tab, Enter, Space, Escape)
- Color is never the sole indicator of state — use text, icons, or borders as well
- Minimum touch target: 44x44px (WCAG 2.5.5 Target Size)
- Autocomplete attributes on form fields (name, email, tel, etc.)

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
- Loading states: show skeleton screens or spinners during async operations
- Success states: show checkmarks, green borders, or success messages
- Error states: red borders, error icons, descriptive error text below the field
- Empty states: helpful messaging with illustration and CTA (never blank screens)
- Confirm destructive actions: "Are you sure?" dialogs before deletion
- Undo support: prefer undo over confirmation dialogs for reversible actions
- Double-click protection: disable buttons after click, re-enable on completion
- Ripple/pulse effect on buttons for tactile feedback (optional, Material-inspired)

### Typography & Readability
- Body text minimum 16px on desktop, 15px on mobile (14px ONLY for captions/labels)
- Line-height: 1.5-1.6 for body, 1.15-1.3 for headings
- Maximum 65-75 characters per line (use max-width: 65ch on text containers)
- Consistent heading hierarchy (NEVER skip h1→h3, always h1→h2→h3)
- Use text-wrap: balance for headings (prevents awkward line breaks)
- Use text-wrap: pretty for paragraphs
- Letter-spacing: tighten headings (-0.02em), slightly open body (0.01em)
- Subpixel antialiasing: -webkit-font-smoothing: antialiased
- Paragraph spacing: margin-bottom equal to line-height for paragraph separation
- Avoid centered text blocks longer than 3 lines — left-align long content
- Use optical alignment: text-indent: -0.02em on left-aligned headings
- Lists: consistent bullet/number style, proper indentation, 1.4-1.5 line-height
- Code blocks: monospace font, syntax highlighting, copy button
- Truncation: use text-overflow: ellipsis for single-line, -webkit-line-clamp for multi-line

### Spacing & Layout — THE SPACING SCALE
- Base unit: 4px (multiply: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128)
- Component padding: 12-24px (buttons 12-16px, cards 16-24px, sections 80-120px)
- Gap between cards/items: 16-24px
- Section vertical padding: 80-120px (minimum 64px)
- Generous whitespace between major sections
- Group related elements with proximity (< 16px gap)
- Separate unrelated groups with distance (> 32px gap)
- Visual hierarchy through size > weight > color > position
- Consistent margin/padding throughout the page
- Asymmetric padding for visual interest: different top vs bottom padding
- Content width: 640-720px for text-heavy sections (readability optimal)
- Full bleed for images and backgrounds: negative margins or 100vw
- Breathing room: at least 24px between any interactive element and text
- Responsive spacing: use clamp() for fluid values, e.g. padding: clamp(40px, 8vw, 120px) 0;

### Navigation Patterns
- Primary nav: max 5-7 items visible
- Mobile: hamburger menu with slide-in panel or full-screen overlay
- Active page indicator (underline, color change, or background)
- Sticky header: add box-shadow on scroll for depth
- Breadcrumbs for deep navigation (> 2 levels)
- Dropdown menus: appear on hover (desktop) or click (mobile/touch)
- Mega-menu for complex sites: group items by category with descriptions
- Search bar: prominent placement, type-ahead suggestions
- Back button/navigation: clear way to return to previous context
- Footer navigation: organized in columns by category
- Skip link: "Skip to main content" as first focusable element
- Logo always links to homepage

### Form Design Patterns
- Label above field (not inline, not placeholder-only)
- Visual indicator for required fields (asterisk or "Required" text)
- Inline validation: validate on blur, show errors immediately
- Error messages: below the field, red color, descriptive text
- Success indicators: green check mark or border
- Auto-focus first field on page load
- Tab order matches visual order (left-to-right, top-to-bottom)
- Group related fields with fieldset + legend
- Progress indicator for multi-step forms
- Autocomplete attributes: name, email, tel, postal-code, etc.
- Password fields: show/hide toggle button
- File upload: drag-and-drop zone with visual feedback
- Select/dropdown: custom styled for consistency with design system

### Performance & Loading Patterns
- Skeleton screens during loading (preferable to spinners)
- Progressive image loading: low-quality placeholder → full image
- Infinite scroll OR pagination (never both) with loading indicator
- Above-fold content loads in < 1 second (LCP target)
- Interactive in < 2 seconds (FID target)
- No layout shift (CLS target < 0.1) — set dimensions on all images/embeds
- Lazy load below-fold images: loading="lazy"
- Preload critical resources: fonts, hero image
- Defer non-critical JS: async or defer attributes
- Use content-visibility: auto for off-screen sections

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
- Pop-ups that appear before the user has engaged with content
- CAPTCHA on every form (only on sensitive actions)
- Scroll hijacking (don't override natural scroll behavior)
- Disabled right-click or text selection (frustrates users)
- Newsletter popup within 5 seconds of page load
- Full-page interstitials on mobile (Google penalizes these)
- Login walls for public content (let users browse before asking for signup)
- Tiny close buttons on modals/popups (minimum 32x32px)
- Multiple competing CTAs in the same section
- Orphaned pages with no way to navigate back
`;

// ─── Premium UI Component Patterns (Aceternity UI, Magic UI, Motion Primitives, Animata, Cult UI) ──
// REAL implementations extracted from actual GitHub source code of 5 top component libraries.
// Total 200+ components analyzed, 40+ core visual patterns with complete CSS/JS implementations.
// These patterns are injected into AI prompts to dramatically improve visual quality.

export const PREMIUM_UI_PATTERNS = `
## PREMIUM VISUAL EFFECTS LIBRARY — DEEP IMPLEMENTATION GUIDE
Source: Aceternity UI (20k★), Magic UI (20k★), Motion Primitives (5.4k★), Animata (2.4k★), Cult UI (3.4k★)
Extracted from actual GitHub source code — NOT generic descriptions. Use these REAL patterns.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CATEGORY A: BACKGROUND EFFECTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### A1. AURORA GRADIENT BACKGROUND (Aceternity UI — real @keyframes)
Slow-shifting multi-color gradient. The REAL Aceternity implementation uses 60s linear infinite.
\`\`\`css
.aurora-bg {
  position: relative; overflow: hidden;
}
.aurora-bg::before {
  content: '';
  position: absolute; inset: -50%;
  background: repeating-linear-gradient(100deg,
    var(--aurora-1, #3b82f6) 10%, var(--aurora-2, #8b5cf6) 15%,
    var(--aurora-3, #06b6d4) 20%, var(--aurora-4, #a855f7) 25%, transparent 30%);
  background-size: 200% 200%;
  background-attachment: fixed;
  filter: blur(10px) saturate(150%);
  animation: aurora 60s linear infinite;
  mix-blend-mode: hard-light; opacity: 0.5;
  pointer-events: none; will-change: background-position;
}
.aurora-bg::after {
  content: '';
  position: absolute; inset: 0;
  background: radial-gradient(ellipse 80% 60% at 50% -20%, rgba(120,119,198,0.3), transparent);
  pointer-events: none;
}
@keyframes aurora {
  from { background-position: 50% 50%, 50% 50%; }
  to { background-position: 350% 50%, 350% 50%; }
}
\`\`\`
Add showRadialGradient overlay: background-image: radial-gradient(ellipse at 45% 0%, rgba(0,0,0,0.2), transparent 60%);
Use for: Hero sections, full-page dark backgrounds, tech/startup landing pages.

### A2. SPOTLIGHT FOLLOW CURSOR (Motion Primitives — real implementation)
A radial-gradient circle that follows the mouse cursor within parent container.
\`\`\`css
.spotlight-container { position: relative; overflow: hidden; }
.spotlight-dot {
  pointer-events: none; position: absolute;
  width: 200px; height: 200px; border-radius: 50%;
  background: radial-gradient(circle at center, rgba(255,255,255,0.08), rgba(255,255,255,0.03) 40%, transparent 80%);
  filter: blur(20px);
  transition: opacity 0.2s ease;
  opacity: 0; /* shown on hover */
  transform: translate(-50%, -50%);
}
.spotlight-container:hover .spotlight-dot { opacity: 1; }
\`\`\`
\`\`\`js
document.querySelectorAll('.spotlight-container').forEach(container => {
  const dot = container.querySelector('.spotlight-dot');
  container.addEventListener('mousemove', e => {
    const rect = container.getBoundingClientRect();
    dot.style.left = (e.clientX - rect.left) + 'px';
    dot.style.top = (e.clientY - rect.top) + 'px';
  });
});
\`\`\`
Use for: Hero sections, feature cards, pricing containers, portfolio items.

### A3. ACETERNITY SPOTLIGHT ENTRANCE (Aceternity UI — @keyframes)
Spotlight that animates in from offset position with scale — fires once on load.
\`\`\`css
.spotlight-entrance {
  position: absolute; top: -40%; left: -50%;
  width: 200%; height: 200%;
  background: ellipse(farthest-side at center) rgba(120,119,198,0.15) 0%, transparent 80%;
  opacity: 0;
  transform: translate(-72%, -62%) scale(0.5);
  animation: spotlight-in 2s ease 0.75s 1 forwards;
  pointer-events: none;
}
@keyframes spotlight-in {
  0% { opacity: 0; transform: translate(-72%, -62%) scale(0.5); }
  100% { opacity: 1; transform: translate(-50%, -40%) scale(1); }
}
\`\`\`
SVG implementation (use <ellipse> with animateMotion for complex paths).
Use for: Hero section background accent, headline spotlight, feature highlight.

### A4. ANIMATED BEAM / METEOR SHOWER (Animata — real pattern)
Vertical beams that animate downward like meteors — great for dark hero backgrounds.
\`\`\`css
.beam-container {
  position: absolute; inset: 0; overflow: hidden;
  display: flex; justify-content: space-between;
  background: linear-gradient(to top, #1e1b4b, #0f172a);
}
.beam-container::after {
  content: ''; position: absolute; inset: 0; top: 50%;
  background: radial-gradient(50% 50% at 50% 50%, rgba(7,42,57,1), rgba(7,42,57,0));
  opacity: 0.4; border-radius: 50%;
}
.beam-line { position: relative; width: 1px; height: 100%; background: rgba(255,255,255,0.1); transform: rotate(12deg); }
.beam-drop {
  width: 6px; height: 48px;
  clip-path: polygon(54% 0, 54% 0, 60% 100%, 40% 100%);
  background: linear-gradient(to bottom, rgba(255,255,255,0.5), #e0e7ff 75%, rgba(255,255,255,0.5));
  transform: translateY(-20%);
  animation: meteor var(--dur, 11s) var(--delay, 0s) ease-in-out infinite;
}
@keyframes meteor {
  0% { transform: translateY(-20%) translateX(-50%); }
  100% { transform: translateY(300%) translateX(-50%); }
}
\`\`\`
Place 10-20 beam-lines spaced evenly. Every 4th gets a beam-drop with varied --dur (7s or 11s) and --delay.
Use for: Dark hero backgrounds, tech/developer sites, gaming sites.

### A5. BLURRY BLOB BACKGROUND (Animata)
Two large colorful blobs with mix-blend-mode and blur creating organic gradient feel.
\`\`\`css
.blob-container { position: relative; min-height: 300px; overflow: hidden; }
.blob {
  position: absolute; width: 288px; height: 288px;
  border-radius: 4px; opacity: 0.45;
  mix-blend-mode: multiply; filter: blur(48px);
  animation: pop-blob 5s ease-in-out infinite alternate;
}
.blob-1 { right: -96px; top: -112px; background: var(--blob-1, #60a5fa); }
.blob-2 { left: -160px; top: -256px; background: var(--blob-2, #a855f7); animation-delay: -2s; }
@keyframes pop-blob {
  0% { transform: scale(1) translate(0, 0); }
  33% { transform: scale(1.1) translate(20px, -15px); }
  66% { transform: scale(0.95) translate(-10px, 10px); }
  100% { transform: scale(1.05) translate(15px, -5px); }
}
\`\`\`
Use for: Section backgrounds, card backgrounds, page-level ambient effects.

### A6. MOVING GRADIENT OVERLAY (Animata)
Animated gradient that slowly shifts position in the background — subtle ambient motion.
\`\`\`css
.moving-gradient {
  position: relative; overflow: hidden; background: #fff;
}
.moving-gradient::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(to right, #eab308 30%, #a16207 50%, #ec4899 80%);
  background-size: 300% auto; opacity: 0.15;
  animation: bg-position 8s ease infinite alternate;
}
.moving-gradient::after {
  content: ''; position: absolute; inset: 0;
  backdrop-filter: blur(16px); z-index: 1;
}
@keyframes bg-position {
  from { background-position: 0% center; }
  to { background-position: 100% center; }
}
\`\`\`
Use for: Section backgrounds, card backgrounds with warm/creative feel.

### A7. INTERACTIVE GRID (Animata)
Grid of small squares that ripple/highlight on mouse interaction with cascading delay.
\`\`\`css
.interactive-grid { position: absolute; inset: 0; overflow: hidden; }
.grid-cell {
  position: absolute; width: 24px; height: 24px; padding: 1px;
  border: 1px solid rgba(156,163,175,0.3); border-radius: 4px;
}
.grid-cell-inner {
  width: 100%; height: 100%; border-radius: 3px;
  background: rgba(156,163,175,0.3); opacity: 0;
  transform: scale(0.9);
  transition: opacity 0.7s ease, transform 0.7s ease;
}
.grid-cell-inner.active {
  opacity: 1; transform: scale(1);
}
\`\`\`
\`\`\`js
// Highlight logic: on mouseover, pick random cells and apply increasing transition-delay: (x+y)ms
document.querySelectorAll('.grid-cell').forEach(cell => {
  cell.addEventListener('mouseenter', () => {
    // Highlight nearby cells with radiating delay
    const x = parseInt(cell.dataset.x), y = parseInt(cell.dataset.y);
    document.querySelectorAll('.grid-cell').forEach(c => {
      const cx = parseInt(c.dataset.x), cy = parseInt(c.dataset.y);
      if (Math.abs(cx-x) + Math.abs(cy-y) < 5) {
        c.querySelector('.grid-cell-inner').style.transitionDelay = (Math.abs(cx-x)+Math.abs(cy-y))*100 + 'ms';
        c.querySelector('.grid-cell-inner').classList.add('active');
        setTimeout(() => c.querySelector('.grid-cell-inner').classList.remove('active'), 2000);
      }
    });
  });
});
\`\`\`
Use for: Creative hero backgrounds, developer/tech sites, interactive showcases.

### A8. ANIMATED GRADIENT RADIAL (Cult UI — real pattern)
Multiple radial-gradient circles that shift position/color cyclically.
\`\`\`css
.radial-gradient-animated {
  position: absolute; inset: 0;
  background:
    radial-gradient(circle at 20% 30%, rgba(59,130,246,0.3), transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(139,92,246,0.25), transparent 50%),
    radial-gradient(circle at 50% 50%, rgba(6,182,212,0.2), transparent 40%);
  background-size: 200% 200%;
  animation: radial-shift 10s ease-in-out infinite alternate;
}
@keyframes radial-shift {
  0% { background-position: 0% 0%, 100% 100%, 50% 50%; }
  50% { background-position: 100% 0%, 0% 100%, 50% 0%; }
  100% { background-position: 50% 100%, 50% 0%, 0% 50%; }
}
\`\`\`
Use for: Hero backgrounds, card ambient effects, dark section underlays.

### A9. NOISE TEXTURE OVERLAY (Cult UI — premium feel)
SVG noise texture at low opacity adds premium visual quality to any surface.
\`\`\`css
.noise-overlay::before {
  content: ''; position: absolute; inset: 0; border-radius: inherit;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events: none; z-index: 1; opacity: 0.4;
}
\`\`\`
Layer this on top of any gradient background, glassmorphism card, or hero section.

### A10. DOT PATTERN BACKGROUND (Animata)
Subtle repeating dot pattern — clean, minimal aesthetic.
\`\`\`css
.dot-bg {
  background-image: radial-gradient(circle, rgba(0,0,0,0.08) 1px, transparent 1px);
  background-size: 20px 20px;
}
.dot-bg-dark {
  background-image: radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px);
  background-size: 20px 20px;
}
\`\`\`
Use for: Section backgrounds, card backgrounds, hero underlays.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CATEGORY B: BORDER & GLOW EFFECTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### B1. BORDER TRAIL (Motion Primitives — real offset-path)
Animated dot that travels around the perimeter of a container using CSS offset-path.
\`\`\`css
.border-trail-container {
  position: relative; border-radius: 16px;
  border: 1px solid transparent;
  mask-clip: padding-box, border-box;
  mask-composite: intersect;
  mask-image: linear-gradient(transparent, transparent), linear-gradient(#000, #000);
}
.border-trail-dot {
  position: absolute; width: 60px; aspect-ratio: 1;
  background: var(--trail-color, #3b82f6); border-radius: 50%;
  offset-path: rect(0 auto auto 0 round 60px);
  animation: border-trail-move 5s linear infinite;
}
@keyframes border-trail-move {
  from { offset-distance: 0%; }
  to { offset-distance: 100%; }
}
\`\`\`
Use for: Featured cards, pricing highlights, CTA containers, form containers.

### B2. GLOW EFFECT — ROTATING CONIC (Motion Primitives — real modes)
Multi-color glow that rotates behind a card. Supports 6 modes: rotate, pulse, breathe, colorShift, flowHorizontal, static.
\`\`\`css
.glow-effect {
  pointer-events: none; position: absolute; inset: 0;
  transform: scale(var(--glow-scale, 1)); filter: blur(16px);
  will-change: transform; backface-visibility: hidden;
  background: conic-gradient(from 0deg at 50% 50%, #FF5733, #33FF57, #3357FF, #F1C40F);
  animation: glow-rotate 5s linear infinite;
}
@keyframes glow-rotate {
  from { background: conic-gradient(from 0deg at 50% 50%, #FF5733, #33FF57, #3357FF, #F1C40F); }
  to { background: conic-gradient(from 360deg at 50% 50%, #FF5733, #33FF57, #3357FF, #F1C40F); }
}
/* Pulse mode: */
.glow-pulse {
  animation: glow-pulse-anim 5s ease-in-out infinite alternate;
}
@keyframes glow-pulse-anim {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.1); }
}
/* Breathe mode: */
.glow-breathe {
  animation: glow-breathe-anim 5s ease-in-out infinite alternate;
}
@keyframes glow-breathe-anim {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
\`\`\`
Container needs position:relative overflow:hidden. Place .glow-effect behind content with z-index:-1.
Use for: Featured cards, hero containers, pricing highlights, CTAs.

### B3. SHINE BORDER / BORDER BEAM (Magic UI — rotation technique)
Animated gradient that rotates around a card border. The REAL pattern uses @property for --angle.
\`\`\`css
@property --border-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}
.shine-border {
  position: relative; border-radius: 16px; padding: 2px;
  background: conic-gradient(from var(--border-angle), transparent 60%, var(--accent, #ffaa40) 75%, var(--accent2, #9c40ff) 85%, transparent 95%);
  animation: border-rotate 6s linear infinite;
}
.shine-border > .inner {
  background: var(--card-bg, #0f172a);
  border-radius: 14px; padding: 24px;
  position: relative; z-index: 1;
}
@keyframes border-rotate {
  from { --border-angle: 0deg; }
  to { --border-angle: 360deg; }
}
\`\`\`
Fallback for browsers without @property: use rotating background-image with pseudo-element.
Use for: Featured pricing cards, CTA containers, testimonial highlights, hero cards.

### B4. ANIMATED GRADIENT BORDER (static rotate)
Card with dual-gradient border using padding-box / border-box trick.
\`\`\`css
.gradient-border-card {
  position: relative; border-radius: 16px;
  background: linear-gradient(var(--bg, #0f172a), var(--bg, #0f172a)) padding-box,
              linear-gradient(135deg, var(--accent, #3b82f6), var(--primary, #8b5cf6), var(--accent, #3b82f6)) border-box;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}
.gradient-border-card:hover {
  background: linear-gradient(var(--bg, #0f172a), var(--bg, #0f172a)) padding-box,
              linear-gradient(315deg, var(--accent, #3b82f6), #ec4899, var(--accent, #3b82f6)) border-box;
}
\`\`\`
Use for: CTA sections, sign-up forms, featured content, contact forms.

### B5. GLASSMORPHISM PREMIUM (Cult UI — multi-layer TextureCard pattern)
The REAL Cult UI TextureCard uses 5 nested rounded divs with decreasing border-radius for premium depth.
\`\`\`css
.glass-premium {
  background: rgba(255,255,255,0.03);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.05);
}
/* Cult UI TextureCard depth trick — graduated nested borders: */
.texture-card {
  border-radius: 24px;
  border: 1px solid rgba(255,255,255,0.6);
  background: linear-gradient(to bottom, rgba(245,245,245,0.7), rgba(255,255,255,0.7));
}
.texture-card > .layer-1 { border-radius: 23px; border: 1px solid rgba(0,0,0,0.1); }
.texture-card > .layer-1 > .layer-2 { border-radius: 22px; border: 1px solid rgba(255,255,255,0.5); }
.texture-card > .layer-1 > .layer-2 > .layer-3 { border-radius: 21px; border: 1px solid rgba(0,0,0,0.07); }
.texture-card > .layer-1 > .layer-2 > .layer-3 > .content {
  border-radius: 20px; border: 1px solid rgba(255,255,255,0.5);
  padding: 24px;
}
/* Dark mode: swap border colors to dark variants */
\`\`\`
Add noise overlay (A9) on top for ultimate premium feel.
Use for: Feature cards, pricing, navbar, modals, sidebars. The 5-layer trick creates incredible depth.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CATEGORY C: TEXT EFFECTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### C1. TEXT SHIMMER (Motion Primitives — REAL bg-clip pattern)
Shimmer gradient sweeps across text. Uses background-size 250%, bg-clip text, linear animation.
\`\`\`css
.text-shimmer {
  display: inline-block;
  background-size: 250% 100%;
  background-clip: text; -webkit-background-clip: text;
  -webkit-text-fill-color: transparent; color: transparent;
  background-repeat: no-repeat;
  --base-color: #a1a1aa; --shimmer-color: #000;
  background-image:
    linear-gradient(90deg, transparent calc(50% - 40px), var(--shimmer-color), transparent calc(50% + 40px)),
    linear-gradient(var(--base-color), var(--base-color));
  animation: text-shimmer-move 2s linear infinite;
}
@keyframes text-shimmer-move {
  from { background-position: 100% center; }
  to { background-position: 0% center; }
}
/* Dark mode: --base-color: #71717a; --shimmer-color: #fff; */
\`\`\`
Use for: Hero headlines, feature titles, CTA text, metric labels, loading states.

### C2. TEXT EFFECT — BLUR REVEAL (Motion Primitives — per-word/char animation)
Words/letters appear one by one from blur. Supports presets: blur, fade-in-blur, scale, fade, slide.
\`\`\`css
/* Per-word stagger with blur preset: */
.text-blur-reveal .word {
  display: inline-block; white-space: pre;
  opacity: 0; filter: blur(12px);
  animation: word-blur-in 0.3s ease forwards;
}
.text-blur-reveal .word:nth-child(1) { animation-delay: 0s; }
.text-blur-reveal .word:nth-child(2) { animation-delay: 0.05s; }
.text-blur-reveal .word:nth-child(3) { animation-delay: 0.1s; }
.text-blur-reveal .word:nth-child(4) { animation-delay: 0.15s; }
.text-blur-reveal .word:nth-child(5) { animation-delay: 0.2s; }
.text-blur-reveal .word:nth-child(6) { animation-delay: 0.25s; }
.text-blur-reveal .word:nth-child(7) { animation-delay: 0.3s; }
.text-blur-reveal .word:nth-child(8) { animation-delay: 0.35s; }
@keyframes word-blur-in {
  from { opacity: 0; filter: blur(12px); }
  to { opacity: 1; filter: blur(0px); }
}
/* Fade-in-blur variant (blur + slide up): */
@keyframes word-blur-slide-in {
  from { opacity: 0; filter: blur(12px); transform: translateY(20px); }
  to { opacity: 1; filter: blur(0px); transform: translateY(0); }
}
/* Scale variant: */
@keyframes word-scale-in {
  from { opacity: 0; transform: scale(0); }
  to { opacity: 1; transform: scale(1); }
}
\`\`\`
Per-char stagger: use delay increments of 0.03s. Per-line: 0.1s. Per-word: 0.05s (from real source).
Use for: Hero headings, section titles, taglines, about sections. Extremely premium when combined with serif fonts.

### C3. ANIMATED GRADIENT TEXT (Animata — bg-position animation)
Text with animated gradient that shifts position continuously.
\`\`\`css
.gradient-text {
  background: linear-gradient(to right, #eab308 30%, #a16207 50%, #ec4899 80%);
  background-size: 200% auto;
  background-clip: text; -webkit-background-clip: text;
  -webkit-text-fill-color: transparent; color: transparent;
  animation: gradient-text-shift 3s ease infinite alternate;
}
@keyframes gradient-text-shift {
  from { background-position: 0% center; }
  to { background-position: 100% center; }
}
\`\`\`
Use for: Highlighted words in headlines, feature labels, section titles.

### C4. WAVE REVEAL (Animata — letter-by-letter with direction)
Letters/words pop in with staggered delay and optional blur. Supports "up" and "down" directions.
\`\`\`css
.wave-reveal { display: flex; flex-wrap: wrap; justify-content: center; white-space: pre; }
.wave-letter {
  display: inline-block; opacity: 0;
  animation: reveal-down 2s ease-in-out forwards, content-blur 2s ease-in-out forwards;
  animation-delay: var(--letter-delay, 0ms);
}
@keyframes reveal-down {
  from { transform: translateY(-20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
@keyframes reveal-up {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
@keyframes content-blur {
  from { filter: blur(8px); }
  to { filter: blur(0px); }
}
\`\`\`
Set --letter-delay: calc(INDEX * 50ms) per letter, or per word with offset tracking.
Use for: Hero headlines (WWDC-style), landing page titles, splash screens.

### C5. STAGGERED DROP LETTERS (Animata — spring-like per-character)
Each letter drops in from above with staggered timing. The real pattern uses delay: index * 0.09.
\`\`\`css
.stagger-drop { display: flex; position: relative; }
.stagger-drop .letter {
  display: inline-block; font-weight: 700; font-size: 4rem;
  opacity: 0; transform: translateY(-150px);
  animation: letter-drop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2));
}
@keyframes letter-drop {
  from { opacity: 0; transform: translateY(-150px); }
  to { opacity: 1; transform: translateY(0); }
}
/* Apply: .letter:nth-child(1) { animation-delay: 0s } .letter:nth-child(2) { animation-delay: 0.09s } etc. */
\`\`\`
Use for: Hero brand names, splash screen titles, loading animations.

### C6. TEXT FLIP / WORD CYCLE (Animata)
Words rotate through a list with vertical overflow hidden — classic flip effect.
\`\`\`css
.text-flip-container { display: flex; gap: 16px; font-size: 1.8rem; font-weight: 600; }
.text-flip-words {
  display: flex; flex-direction: column; overflow: hidden;
  height: 1.2em; /* exactly one line height */
  color: var(--accent, #60a5fa);
}
.text-flip-words span {
  display: block;
  animation: flip-words 8s steps(1) infinite;
}
@keyframes flip-words {
  0% { transform: translateY(0%); }
  20% { transform: translateY(-100%); }
  40% { transform: translateY(-200%); }
  60% { transform: translateY(-300%); }
  80% { transform: translateY(-400%); }
  100% { transform: translateY(0%); }
}
\`\`\`
Put 5 words as spans inside .text-flip-words. Adjust percentages for more/fewer words.
Use for: Hero taglines ("We build ___ apps" cycling through words), feature descriptions.

### C7. TYPEWRITER WITH CURSOR (Animata — real implementation)
Character-by-character typing with blinking cursor and optional repeat/erase cycle.
\`\`\`css
.typewriter { font-family: monospace; position: relative; }
.typewriter-text {
  overflow: hidden; white-space: nowrap; width: 0;
  border-right: 2px solid var(--accent, #3b82f6);
  animation: typing 3s steps(var(--chars, 30)) forwards, cursor-blink 0.7s step-end infinite;
}
@keyframes typing { to { width: var(--text-width, 100%); } }
@keyframes cursor-blink { 50% { border-color: transparent; } }
/* For repeat cycle, add reverse typing: */
@keyframes typing-loop {
  0%, 10% { width: 0; }
  50%, 60% { width: var(--text-width, 100%); }
  90%, 100% { width: 0; }
}
\`\`\`
\`\`\`js
// JS typed text implementation (real Animata pattern):
function setupTypewriter(el) {
  const text = el.dataset.text;
  let i = 0, dir = 1, timeout;
  el.style.setProperty('--chars', text.length);
  const type = () => {
    el.textContent = text.slice(0, i);
    i += dir;
    if (i > text.length) { dir = -1; timeout = setTimeout(type, 1000); return; }
    if (i < 0) { dir = 1; timeout = setTimeout(type, 500); return; }
    timeout = setTimeout(type, dir > 0 ? 32 : 16);
  };
  type();
}
document.querySelectorAll('[data-typewriter]').forEach(setupTypewriter);
\`\`\`
Use for: Hero subtitles, terminal-style sections, developer sites, tech landing pages.

### C8. SPINNING TEXT (Motion Primitives — circular text)
Letters arranged in a circle that rotates infinitely.
\`\`\`css
.spinning-text { position: relative; width: 10ch; height: 10ch; }
.spinning-text-inner { animation: spin-text 10s linear infinite; }
.spinning-text .char {
  position: absolute; left: 50%; top: 50%;
  font-size: 1rem;
  transform: translate(-50%, -50%) rotate(calc(360deg / var(--total) * var(--index))) translateY(-5ch);
  transform-origin: center;
}
@keyframes spin-text { to { transform: rotate(360deg); } }
.spinning-text-reverse .spinning-text-inner { animation-direction: reverse; }
\`\`\`
Split text into chars. Set --total and --index as CSS vars on each char span.
Use for: Loading indicators, decorative elements, creative portfolio pages.

### C9. GLITCH TEXT (Animata — with starry background)
Text with a CSS glitch animation overlay, set against a starfield.
\`\`\`css
.glitch-container {
  position: relative; background: linear-gradient(to bottom, #4B0082, #3B0066, #2B004A);
  display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 48px;
}
.glitch-star {
  position: absolute; border-radius: 50%; background: #fafafa; opacity: 0.75;
  animation: twinkle 5s infinite;
}
@keyframes twinkle { 0%, 100% { opacity: 0.75; } 50% { opacity: 0.2; } }
.glitch-text {
  font-size: 4rem; font-weight: 900; color: #fff; position: relative; z-index: 10;
  animation: glitch 0.5s infinite;
}
@keyframes glitch {
  0% { text-shadow: 2px 2px #ff00ff, -2px -2px #00ffff; transform: translate(0); }
  25% { text-shadow: -2px 2px #ff00ff, 2px -2px #00ffff; transform: translate(2px, -1px); }
  50% { text-shadow: 2px -2px #ff00ff, -2px 2px #00ffff; transform: translate(-1px, 2px); }
  75% { text-shadow: -2px -2px #ff00ff, 2px 2px #00ffff; transform: translate(1px, 1px); }
  100% { text-shadow: 2px 2px #ff00ff, -2px -2px #00ffff; transform: translate(0); }
}
\`\`\`
Create 30-50 stars with random position/size/animation-delay.
Use for: Gaming sites, cyberpunk aesthetic, error pages, creative projects.

### C10. ANIMATED NUMBER TICKER (Animata — spring-based rolling digits)
Numbers that roll into place digit-by-digit with spring physics.
\`\`\`css
.ticker { display: flex; overflow: hidden; font-variant-numeric: tabular-nums; }
.ticker-digit {
  display: flex; flex-direction: column;
  transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}
.ticker-digit span { display: block; text-align: center; }
\`\`\`
\`\`\`js
function animateTicker(el) {
  const target = el.dataset.value;
  target.split('').forEach((char, i) => {
    const digit = el.children[i];
    if (!isNaN(char)) {
      const height = digit.children[0].offsetHeight;
      digit.style.transform = 'translateY(' + (-height * parseInt(char)) + 'px)';
      digit.style.transitionDelay = ((target.length - i) * 50) + 'ms';
    }
  });
}
// Each digit container has 0-9 stacked vertically. translateY to show target digit.
\`\`\`
Use for: Stats sections, counters, pricing numbers, dashboard metrics.

### C11. SCROLL REVEAL TEXT (Animata — opacity based on scroll position)
Text words/chars gradually go from dimmed to bright as user scrolls through a section.
\`\`\`css
.scroll-reveal-container { height: 400px; overflow-y: auto; position: relative; }
.scroll-reveal-content { position: sticky; top: 0; display: flex; flex-wrap: wrap; padding: 32px; }
.scroll-reveal-word {
  display: inline-block; opacity: 0.3;
  transition: opacity 0.15s ease;
}
.scroll-reveal-word.bright { opacity: 1; }
\`\`\`
\`\`\`js
// Words brighten based on scroll position within container
const container = document.querySelector('.scroll-reveal-container');
const words = container.querySelectorAll('.scroll-reveal-word');
container.addEventListener('scroll', () => {
  const progress = container.scrollTop / (container.scrollHeight - container.clientHeight);
  words.forEach((w, i) => {
    w.classList.toggle('bright', (i / words.length) < progress);
  });
});
\`\`\`
Use for: About sections, story/mission pages, long-form content, manifesto sections.

### C12. TEXT ANIMATE — ADVANCED EASING (Cult UI — 8 animation types)
Professional text animation with expert easing curves. Types: fadeIn, fadeInUp, popIn, shiftInUp, rollIn, whipIn, whipInUp, calmInUp.
\`\`\`css
/* whipInUp — fast dramatic entrance (Cult UI): */
.whip-in-up .word {
  display: inline-block; opacity: 0; transform: translateY(200%);
  animation: whip-up 0.75s cubic-bezier(0.5, -0.15, 0.25, 1.05) forwards;
  animation-delay: calc(var(--word-index, 0) * 0.05s + 0.2s);
}
@keyframes whip-up { to { opacity: 1; transform: translateY(0); } }

/* calmInUp — gentle, engaging entrance: */
.calm-in-up .word {
  display: inline-block; opacity: 0; transform: translateY(200%);
  animation: calm-up 0.85s cubic-bezier(0.125, 0.92, 0.69, 0.975) forwards;
  animation-delay: calc(var(--word-index, 0) * 0.03s + 0.2s);
}
@keyframes calm-up { to { opacity: 1; transform: translateY(0); } }

/* shiftInUp — dramatic shift with controlled middle: */
.shift-in-up .word {
  display: inline-block; opacity: 0; transform: translateY(100%);
  animation: shift-up 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  animation-delay: calc(var(--word-index, 0) * 0.03s + 0.2s);
}
@keyframes shift-up { to { opacity: 1; transform: translateY(0); } }

/* rollIn — per-word with letter stagger: */
.roll-in .letter {
  display: inline-block; opacity: 0; transform: translateY(0.25em);
  animation: roll 0.65s cubic-bezier(0.65, 0, 0.75, 1) forwards;
  animation-delay: calc(var(--word-index, 0) * 0.13s + var(--letter-index, 0) * 0.025s);
}
@keyframes roll { to { opacity: 1; transform: translateY(0); } }
\`\`\`
These easing curves are from Cult UI's production code. They create professional, Apple-quality text animations.
Use for: Hero headings, section titles, page transitions, feature headlines.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CATEGORY D: CARD & LAYOUT EFFECTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### D1. MAGNETIC HOVER (Motion Primitives — real spring physics)
Element follows cursor with spring-based displacement. Real values: stiffness:26.7, damping:4.1, mass:0.2.
\`\`\`css
.magnetic-element {
  transition: transform 0.4s cubic-bezier(0.25, 0.1, 0.25, 1);
  will-change: transform;
}
\`\`\`
\`\`\`js
document.querySelectorAll('.magnetic-element').forEach(el => {
  const intensity = 0.6, range = 100;
  el.addEventListener('mousemove', e => {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width/2, cy = rect.top + rect.height/2;
    const dx = e.clientX - cx, dy = e.clientY - cy;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist <= range) {
      const scale = 1 - dist/range;
      el.style.transform = 'translate(' + (dx*intensity*scale) + 'px,' + (dy*intensity*scale) + 'px)';
    }
  });
  el.addEventListener('mouseleave', () => { el.style.transform = 'translate(0,0)'; });
});
\`\`\`
Use for: CTA buttons, nav items, feature cards, interactive elements.

### D2. 3D TILT CARD (Motion Primitives — perspective transform)
Card tilts in 3D based on mouse position. rotationFactor:15deg, perspective:1000px.
\`\`\`css
.tilt-card {
  transform-style: preserve-3d;
  transition: transform 0.15s ease;
  will-change: transform;
}
\`\`\`
\`\`\`js
document.querySelectorAll('.tilt-card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const rect = card.getBoundingClientRect();
    const xPos = (e.clientX - rect.left) / rect.width - 0.5;
    const yPos = (e.clientY - rect.top) / rect.height - 0.5;
    const rotateX = yPos * -15; // 15deg rotation factor
    const rotateY = xPos * 15;
    card.style.transform = 'perspective(1000px) rotateX('+rotateX+'deg) rotateY('+rotateY+'deg)';
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
  });
});
\`\`\`
Use for: Feature cards, portfolio items, product showcases, team member cards.

### D3. BENTO GRID LAYOUT (Aceternity + Magic UI style)
Feature grid with varied card sizes. Mix of span-2 and span-1 cards.
\`\`\`css
.bento-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.bento-item {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px; padding: 32px;
  transition: all 0.3s ease;
  position: relative; overflow: hidden;
}
.bento-item:hover {
  background: rgba(255,255,255,0.06);
  box-shadow: 0 0 30px rgba(var(--accent-rgb, 59,130,246), 0.08);
  border-color: rgba(var(--accent-rgb, 59,130,246), 0.15);
}
/* Aceternity skewed variant: */
.bento-item.skewed { background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02)); }
.bento-item.large { grid-column: span 2; }
.bento-item.tall { grid-row: span 2; }
.bento-item.featured { grid-column: span 2; grid-row: span 2; }
@media (max-width: 768px) {
  .bento-grid { grid-template-columns: 1fr; }
  .bento-item.large, .bento-item.featured { grid-column: span 1; grid-row: span 1; }
}
\`\`\`
Use for: Feature sections, dashboard previews, SaaS marketing, service showcases.

### D4. PROGRESSIVE BLUR (Motion Primitives — layered backdrop-filter)
Content gradually blurs from one edge — creates premium fade effect on scroll areas.
\`\`\`css
.progressive-blur { position: relative; }
.progressive-blur-layer {
  pointer-events: none; position: absolute; inset: 0; border-radius: inherit;
}
/* Create 8 layers with increasing blur and mask gradients: */
.pb-1 { mask-image: linear-gradient(to bottom, transparent 0%, #000 12.5%, #000 25%, transparent 37.5%); backdrop-filter: blur(0px); -webkit-backdrop-filter: blur(0px); }
.pb-2 { mask-image: linear-gradient(to bottom, transparent 12.5%, #000 25%, #000 37.5%, transparent 50%); backdrop-filter: blur(0.25px); -webkit-backdrop-filter: blur(0.25px); }
.pb-3 { mask-image: linear-gradient(to bottom, transparent 25%, #000 37.5%, #000 50%, transparent 62.5%); backdrop-filter: blur(0.5px); -webkit-backdrop-filter: blur(0.5px); }
.pb-4 { mask-image: linear-gradient(to bottom, transparent 37.5%, #000 50%, #000 62.5%, transparent 75%); backdrop-filter: blur(0.75px); -webkit-backdrop-filter: blur(0.75px); }
.pb-5 { mask-image: linear-gradient(to bottom, transparent 50%, #000 62.5%, #000 75%, transparent 87.5%); backdrop-filter: blur(1px); -webkit-backdrop-filter: blur(1px); }
.pb-6 { mask-image: linear-gradient(to bottom, transparent 62.5%, #000 75%, #000 87.5%, transparent 100%); backdrop-filter: blur(1.25px); -webkit-backdrop-filter: blur(1.25px); }
.pb-7 { mask-image: linear-gradient(to bottom, transparent 75%, #000 87.5%, #000 100%); backdrop-filter: blur(1.5px); -webkit-backdrop-filter: blur(1.5px); }
.pb-8 { mask-image: linear-gradient(to bottom, transparent 87.5%, #000 100%); backdrop-filter: blur(1.75px); -webkit-backdrop-filter: blur(1.75px); }
\`\`\`
Use for: Bottom of hero sections fading into content, scroll indicators, list fade-outs.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CATEGORY E: ANIMATION PATTERNS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### E1. BLUR-FADE ENTRANCE (Magic UI — direction + delay + offset)
Elements fade in from blur. Props: duration:0.4s, delay:0s, offset:6px, direction:down, blur:6px.
\`\`\`css
.blur-fade {
  opacity: 0; filter: blur(6px);
  transform: translateY(6px); /* down direction */
  transition: opacity 0.4s ease, filter 0.4s ease, transform 0.4s ease;
}
.blur-fade.visible { opacity: 1; filter: blur(0); transform: translateY(0); }
/* Direction variants: */
.blur-fade-up { transform: translateY(-6px); }
.blur-fade-left { transform: translateX(-6px); }
.blur-fade-right { transform: translateX(6px); }
/* Stagger: add transition-delay: calc(var(--index, 0) * 0.1s); */
\`\`\`
Use for: Section entrances, card reveals, feature lists, testimonials, images.

### E2. ANIMATED GROUP — 10 PRESETS (Motion Primitives — real preset variants)
Staggered group animation with child presets. The REAL presets from source:
\`\`\`css
/* FADE: children simply fade in */
.anim-group-fade .child { opacity: 0; animation: ag-fade 0.3s ease forwards; }
@keyframes ag-fade { to { opacity: 1; } }

/* SLIDE: children slide up 20px + fade */
.anim-group-slide .child { opacity: 0; transform: translateY(20px); animation: ag-slide 0.3s ease forwards; }
@keyframes ag-slide { to { opacity: 1; transform: translateY(0); } }

/* SCALE: children scale from 0.8 + fade */
.anim-group-scale .child { opacity: 0; transform: scale(0.8); animation: ag-scale 0.3s ease forwards; }
@keyframes ag-scale { to { opacity: 1; transform: scale(1); } }

/* BLUR: children blur in */
.anim-group-blur .child { opacity: 0; filter: blur(4px); animation: ag-blur 0.3s ease forwards; }
@keyframes ag-blur { to { opacity: 1; filter: blur(0); } }

/* BLUR-SLIDE: blur + slide up */
.anim-group-blur-slide .child { opacity: 0; filter: blur(4px); transform: translateY(20px); animation: ag-blur-slide 0.3s ease forwards; }
@keyframes ag-blur-slide { to { opacity: 1; filter: blur(0); transform: translateY(0); } }

/* ZOOM: spring-like scale from 0.5 */
.anim-group-zoom .child { opacity: 0; transform: scale(0.5); animation: ag-zoom 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
@keyframes ag-zoom { to { opacity: 1; transform: scale(1); } }

/* FLIP: rotateX -90 to 0 */
.anim-group-flip .child { opacity: 0; transform: rotateX(-90deg); animation: ag-flip 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
@keyframes ag-flip { to { opacity: 1; transform: rotateX(0); } }

/* BOUNCE: spring from y:-50 */
.anim-group-bounce .child { opacity: 0; transform: translateY(-50px); animation: ag-bounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
@keyframes ag-bounce { to { opacity: 1; transform: translateY(0); } }
\`\`\`
Apply stagger: .child:nth-child(N) { animation-delay: calc(N * 0.1s); }
Use for: Feature grids, pricing cards, team members, testimonials, icon rows, stats.

### E3. MARQUEE / INFINITE SLIDER (Magic UI + Motion Primitives)
Endlessly scrolling content — logos, testimonials, badges. The REAL implementation duplicates children 2x.
\`\`\`css
.marquee { overflow: hidden; width: 100%; }
.marquee-track {
  display: flex; width: max-content;
  gap: var(--marquee-gap, 48px);
  animation: marquee-scroll var(--marquee-speed, 30s) linear infinite;
}
.marquee-track:hover { animation-play-state: paused; } /* pauseOnHover */
@keyframes marquee-scroll { to { transform: translateX(-50%); } }
/* Reverse: animation-direction: reverse; */
/* Vertical: flex-direction: column; animate translateY instead */
.marquee-vertical .marquee-track {
  flex-direction: column; animation-name: marquee-scroll-v;
}
@keyframes marquee-scroll-v { to { transform: translateY(-50%); } }
\`\`\`
IMPORTANT: Duplicate ALL content exactly 2x inside .marquee-track for seamless loop.
Use for: Partner logos, client logos, testimonial strips, tech stack, social proof.

### E4. IN-VIEW TRIGGER (Motion Primitives — IntersectionObserver)
Master pattern for triggering ANY animation when element enters viewport.
\`\`\`js
const inViewObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      // Optional: only trigger once
      if (entry.target.dataset.once !== undefined) inViewObserver.unobserve(entry.target);
    } else {
      if (entry.target.dataset.once === undefined) entry.target.classList.remove('visible');
    }
  });
}, { threshold: 0.1, rootMargin: '-50px' });
document.querySelectorAll('[data-inview]').forEach(el => inViewObserver.observe(el));
\`\`\`
Add data-inview data-once to ANY element. Pair with .blur-fade, .stagger-item, .text-reveal, .anim-group-*, etc.

### E5. FLOATING PARTICLES (Animata — ambient dots/shapes)
Subtle animated shapes in the background for ambient motion.
\`\`\`css
.particles-container { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.particle {
  position: absolute; border-radius: 50%;
  background: rgba(var(--accent-rgb, 59,130,246), 0.3);
  animation: float-particle var(--dur, 6s) ease-in-out infinite;
  animation-delay: var(--delay, 0s);
}
@keyframes float-particle {
  0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
  33% { transform: translate(15px, -25px) scale(1.2); opacity: 0.5; }
  66% { transform: translate(-10px, 15px) scale(0.8); opacity: 0.4; }
}
\`\`\`
Create 15-20 particles with: random positions (top/left %), random sizes (3-8px), random --dur (4-8s), random --delay (0-5s).
Use for: Hero backgrounds, dark sections, creative landings, portfolio headers.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CATEGORY F: BUTTON & CTA EFFECTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### F1. GLOW BUTTON (Aceternity + Cult UI — radial-gradient follow mouse)
The REAL Cult UI GlowButton tracks mouse position and projects a radial-gradient glow at cursor location.
\`\`\`css
.glow-btn {
  position: relative; overflow: hidden;
  padding: 14px 32px; border-radius: 9999px;
  background: var(--btn-bg); color: var(--btn-text);
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  font-weight: 700; cursor: pointer; text-transform: uppercase;
  transition: all 0.2s ease;
}
.glow-btn:hover { border-color: rgba(var(--accent-rgb), 0.4); }
.glow-btn .glow-spot {
  position: absolute; pointer-events: none;
  width: 200px; height: 120px;
  background: radial-gradient(50% 50% at 50% 50%, rgba(255,255,245,0.9) 3.5%, var(--glow-color, #FFAA81) 26.5%, rgba(255,218,159,0.5) 49%, transparent 92.5%);
  transform: translateX(-50%) translateY(-50%);
  opacity: 0; transition: opacity 0.2s ease;
  filter: blur(5px); z-index: -1;
}
.glow-btn:hover .glow-spot { opacity: 1; }
\`\`\`
\`\`\`js
document.querySelectorAll('.glow-btn').forEach(btn => {
  const spot = btn.querySelector('.glow-spot');
  btn.addEventListener('mousemove', e => {
    const rect = btn.getBoundingClientRect();
    spot.style.left = (e.clientX - rect.left) + 'px';
    spot.style.top = (e.clientY - rect.top) + 'px';
  });
});
\`\`\`
Use for: Primary CTAs, hero buttons, pricing buttons, newsletter subscribes.

### F2. SIMPLE GLOW HOVER BUTTON
Quick glowing button without mouse tracking — simpler, more universal.
\`\`\`css
.glow-hover-btn {
  position: relative; padding: 14px 32px;
  background: var(--accent, #3b82f6); color: white;
  border: none; border-radius: 12px; cursor: pointer;
  font-weight: 600; font-size: 16px;
  transition: all 0.3s ease;
}
.glow-hover-btn:hover {
  box-shadow: 0 0 20px rgba(var(--accent-rgb, 59,130,246), 0.4),
              0 0 40px rgba(var(--accent-rgb, 59,130,246), 0.2),
              0 0 60px rgba(var(--accent-rgb, 59,130,246), 0.1);
  transform: translateY(-2px);
}
.glow-hover-btn:active { transform: translateY(0); }
\`\`\`
Use for: Any CTA button — hero, pricing, sign-up, download, contact.

### F3. MOVING BORDER BUTTON (Aceternity)
Button with an animated dot that travels around its border continuously.
\`\`\`css
.moving-border-btn {
  position: relative; padding: 14px 32px;
  background: transparent; color: var(--text);
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  border-radius: 28px; cursor: pointer;
  overflow: hidden;
}
.moving-border-btn::before {
  content: ''; position: absolute;
  width: 40px; height: 40px; border-radius: 50%;
  background: var(--accent, #3b82f6);
  offset-path: rect(0 auto auto 0 round 28px);
  animation: move-border 2s linear infinite;
  filter: blur(8px); opacity: 0.6;
}
@keyframes move-border { from { offset-distance: 0%; } to { offset-distance: 100%; } }
\`\`\`
Use for: Secondary CTAs, outline buttons, ghost buttons with premium feel.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULES: COMBINING EFFECTS FOR MAXIMUM VISUAL QUALITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### PREMIUM RECIPE — DARK TECH/STARTUP LANDING PAGE:
- Hero: aurora-bg (A1) + particles (E5) + glass-premium navbar (B5) + text-shimmer headline (C1) + blur-fade subtitle (E1) + glow-btn CTA (F1)
- Features: bento-grid (D3) + glow-effect on hover (B2) + blur-fade entrances (E1) staggered
- Social Proof: marquee logos (E3) + animated number ticker (C10) for stats
- Pricing: shine-border on featured tier (B3) + stagger reveal cards (E2-slide) + glow-hover-btn (F2)
- Testimonials: blur-fade cards (E1) + 3D tilt hover (D2) + progressive-blur bottom fade (D4)
- CTA: gradient-border card (B4) + text shimmer (C1) + glow-btn (F1) + spotlight (A2)
- Footer: gradient-border top (B4) + glass-premium (B5)

### PREMIUM RECIPE — LIGHT/CORPORATE SITE:
- Hero: moving-gradient overlay (A6) + wave-reveal heading (C4) + blur-fade subtitle (E1)
- Features: bento-grid (D3) with texture-card style (B5 texture variant) + blur-fade entrances
- Stats: animated number ticker (C10) + blur-fade stagger
- Testimonials: cards with gradient-border (B4) + blur-fade + soft shadow
- CTA: gradient-border container (B4) + moving-border-btn (F3)

### PREMIUM RECIPE — CREATIVE/PORTFOLIO:
- Hero: spotlight-entrance (A3) + staggered drop letters (C5) + magnetic elements (D1)
- Work: 3D tilt cards (D2) + blur-fade entrances + animated group zoom preset (E2)
- About: scroll-reveal text (C11) + progressive-blur
- Contact: glass-premium form (B5) + glow-effect behind (B2) + glow-btn submit (F1)

### PREMIUM RECIPE — GAMING/ENTERTAINMENT:
- Hero: aurora-bg (A1) + animated beam (A4) + glitch-text (C9) + particles (E5)
- Features: glass-premium cards (B5) + glow-effect (B2) + 3D tilt (D2)
- Leaderboard: ticker numbers (C10) + stagger bounce preset (E2)
- Download: glow-btn with neon (F1) + moving-border (F3)

### ACCESSIBILITY — ALWAYS INCLUDE:
\`\`\`css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
\`\`\`

### ACCESSIBILITY — JAVASCRIPT ANIMATIONS:
- Check window.matchMedia('(prefers-reduced-motion: reduce)').matches before enabling GSAP, Three.js, or Lenis
- If reduced motion is preferred: skip GSAP ScrollTrigger, disable Lenis smooth scroll, show static content instead of canvas
- Mobile devices on slow connections should also skip heavy animations:
  \`\`\`js
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isSlowConnection = navigator.connection?.effectiveType === '2g' || navigator.connection?.effectiveType === 'slow-2g';
  if (prefersReduced || isSlowConnection) { /* skip heavy animations, use CSS-only fallbacks */ }
  \`\`\`

### PERFORMANCE RULES:
- Use will-change: transform on animated elements, but ONLY on elements currently animating
- Use transform: translateZ(0) or transform: translate3d(0,0,0) for GPU acceleration
- Keep particle count < 20 to avoid jank
- Use IntersectionObserver to only animate visible elements
- Prefer CSS animations over JS animations when possible
- Use pointer-events: none on all decorative overlay elements
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
    ['gaming', ['game', 'gaming', 'esports', 'play', 'player', 'leaderboard', 'xbox', 'playstation', 'steam', 'twitch', 'streamer']],
    ['nonprofit', ['nonprofit', 'non-profit', 'donate', 'charity', 'volunteer', 'mission', 'impact', 'cause', 'fundraise', 'ngo']],
    ['legal', ['law', 'legal', 'attorney', 'lawyer', 'litigation', 'court', 'practice area', 'consultation', 'justice', 'defense']],
    ['travel', ['travel', 'destination', 'hotel', 'flight', 'booking', 'vacation', 'tour', 'itinerary', 'adventure', 'resort', 'cruise']],
    ['fitness', ['fitness', 'gym', 'workout', 'training', 'exercise', 'muscle', 'crossfit', 'yoga', 'pilates', 'personal trainer']],
    ['music_entertainment', ['music', 'album', 'track', 'concert', 'festival', 'artist', 'band', 'stream', 'spotify', 'vinyl', 'tour']],
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
    'gaming': 'neon_dark',
    'nonprofit': 'nature_organic',
    'legal': 'corporate_trust',
    'travel': 'ocean_depth',
    'fitness': 'neon_dark',
    'music_entertainment': 'midnight_glow',
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
    'education': 17, // Lexend
    'media_news': 1, // Playfair Display + Source Sans
    'real_estate': 0, // Inter
    'gaming': 15, // Unbounded + DM Sans
    'nonprofit': 5, // Poppins + Open Sans
    'legal': 6, // Archivo + Work Sans
    'travel': 16, // Lora + Nunito Sans
    'fitness': 14, // Manrope
    'music_entertainment': 4, // Clash Display + Satoshi
  };
  return FONT_PAIRINGS[map[industry] ?? 0];
}

// ─── Premium Animation Stack (GSAP + Lenis + Three.js + LTX Video) ─────────
// Framer-level quality patterns for the AI to produce cinematic, premium sites.
// These are injected into prompts alongside PREMIUM_UI_PATTERNS for maximum quality.

export const PREMIUM_ANIMATION_STACK = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PREMIUM ANIMATION STACK — FRAMER-LEVEL QUALITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## CDN IMPORTS (add to <head> or before </body>)
GSAP + ScrollTrigger:
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
Lenis Smooth Scroll:
<script src="https://unpkg.com/lenis@1.1.18/dist/lenis.min.js"></script>
Three.js (3D/WebGL):
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>

## GSAP SCROLL PATTERNS

### Fade-Up on Scroll (most common — use on sections, cards, headings):
gsap.registerPlugin(ScrollTrigger);
gsap.utils.toArray('.fade-up').forEach(el => {
  gsap.from(el, { y: 60, opacity: 0, duration: 1, ease: 'power3.out',
    scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' }
  });
});

### Staggered Grid Reveal (cards, features, team members):
gsap.from('.card', { y: 80, opacity: 0, duration: 0.8, stagger: 0.15, ease: 'power2.out',
  scrollTrigger: { trigger: '.cards-grid', start: 'top 80%' }
});

### Parallax Hero Background:
gsap.to('.hero-bg', { yPercent: 30, ease: 'none',
  scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
});

### Hero Title Split-Character Reveal:
// Wrap each char in <span>: "Hello" → <span>H</span><span>e</span>...
gsap.from('.hero-title span', { y: '100%', opacity: 0, duration: 0.8, stagger: 0.03, ease: 'power4.out',
  scrollTrigger: { trigger: '.hero-title', start: 'top 80%' }
});

### Scale-In Section (pinned zoom effect):
gsap.from('.scale-section', { scale: 0.8, opacity: 0, duration: 1.5, ease: 'power2.out',
  scrollTrigger: { trigger: '.scale-section', start: 'top 80%', end: 'top 30%', scrub: true }
});

### Counter/Number Animation:
gsap.to('.counter', { textContent: 1000, duration: 2, ease: 'power1.out', snap: { textContent: 1 },
  scrollTrigger: { trigger: '.stats', start: 'top 80%' }
});

### Horizontal Scroll Gallery (pinned):
const panels = gsap.utils.toArray('.panel');
gsap.to('.panels-container', { xPercent: -100 * (panels.length - 1), ease: 'none',
  scrollTrigger: { trigger: '.horizontal-section', pin: true, scrub: 1, snap: 1 / (panels.length - 1),
    end: () => '+=' + document.querySelector('.panels-container').scrollWidth }
});

## LENIS SMOOTH SCROLL SETUP
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  touchMultiplier: 2
});
function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
requestAnimationFrame(raf);
// Connect Lenis to GSAP ScrollTrigger:
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

## THREE.JS BACKGROUND PATTERNS

### Floating Particles:
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({alpha:true, antialias:true});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.querySelector('.three-container').appendChild(renderer.domElement);
const geo = new THREE.BufferGeometry();
const count = 1500;
const pos = new Float32Array(count*3);
for(let i=0;i<count*3;i++) pos[i]=(Math.random()-0.5)*20;
geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
const mat = new THREE.PointsMaterial({color:0x6366f1, size:0.02, transparent:true, opacity:0.7});
const pts = new THREE.Points(geo, mat);
scene.add(pts);
camera.position.z = 5;
(function animate(){requestAnimationFrame(animate); pts.rotation.y+=0.001; pts.rotation.x+=0.0005; renderer.render(scene,camera);})();
window.addEventListener('resize', ()=>{camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight);});

### Gradient Mesh (organic flowing background):
// Use ShaderMaterial with custom fragment shader for animated gradient mesh
// Simpler approach: multiple overlapping radial gradients with CSS animation (see Aurora A1)

## CINEMATIC SCROLL RECIPES
Combine libraries for maximum Framer-level impact:

### Recipe: Tech/SaaS Premium
- Lenis smooth scroll
- GSAP fade-up on all sections
- Three.js particle background in hero
- Text shimmer (C1) on hero heading
- Blur-fade (E1) staggered on feature cards
- Counter animation on stats section
- Glow button (F1) on CTA
- Marquee (E3) for partner logos

### Recipe: Creative Portfolio
- Lenis smooth scroll
- GSAP horizontal scroll gallery (pinned)
- Parallax images via GSAP scrub
- Magnetic cursor hover (D1) on project cards
- 3D tilt (D2) on selected works
- Staggered text drop (C5) on page title
- Video background (LTX) in hero
- Scale-in section reveals

### Recipe: Luxury Brand / Agency
- Lenis smooth scroll
- GSAP pinned hero with scale+blur entrance
- LTX Video background (cinematic loop)
- Split-character hero text reveal
- Glassmorphism (B5) navbar
- Shine border (B3) on feature cards
- Blur reveal (C2) per-word headings
- Glow CTA button (F1)

### Recipe: E-commerce / Product
- Lenis smooth scroll
- GSAP scroll-scrub product reveal
- Parallax product images
- Marquee brand logos (E3)
- Shimmer text (C1) on sale banners
- Bento grid (D3) product showcase
- Number ticker (C10) for reviews/stats

## FRAMER-LEVEL RENDERING TECHNIQUES

### Variable Fonts + font-variation-settings (SIGNATURE EFFECT)
Variable fonts animate weight/width smoothly. Use Inter, DM Sans, Space Grotesk (all variable).
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap');
h1 { font-variation-settings: 'wght' 400; transition: font-variation-settings 0.4s cubic-bezier(0.22, 1, 0.36, 1); }
h1:hover { font-variation-settings: 'wght' 800; }
/* Animate on scroll with GSAP: */
gsap.to('.hero-title', { fontVariationSettings: '"wght" 900', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
/* Per-letter weight stagger: wrap chars in <span style="--i:N">, then gsap.to each with delay i*0.03 */

### GLSL Shader Backgrounds (GPU-rendered, organic gradients)
Use WebGL canvas with custom fragment shader for animated gradient mesh.
fragSrc: mix 3 colors with sin/cos UV distortion driven by u_time.
Container: <canvas class="shader-bg"> with position:absolute inset:0 z-index:0.
Colors: use brand palette (e.g. #6366f1, #ec4899, #0ea5e9) in shader vec3 values.
Opacity: 0.12 for subtle, 0.25 for dramatic.

### CSS Scroll-Driven Animations (zero JS)
.scroll-reveal { animation: fadeSlideUp linear both; animation-timeline: view(); animation-range: entry 0% entry 50%; }
.scroll-progress { animation: growWidth linear; animation-timeline: scroll(root); }
.parallax-element { animation: parallaxShift linear both; animation-timeline: scroll(root); }

### Magnetic Buttons (pointer attraction)
On mousemove: translate btn by (x*0.3, y*0.3) relative to center.
On mouseleave: spring back with cubic-bezier(0.22, 1, 0.36, 1).

### SVG Clip-Path Reveals
.clip-reveal { clip-path: inset(100% 0 0 0); transition: clip-path 1s cubic-bezier(0.77, 0, 0.175, 1); }
.clip-reveal.visible { clip-path: inset(0 0 0 0); }
.circle-reveal { clip-path: circle(0% at 50% 50%); → circle(75% at 50% 50%); }

### Spring Physics CSS (Framer Motion feel)
--spring-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
--spring-smooth: cubic-bezier(0.22, 1, 0.36, 1);
--spring-snappy: cubic-bezier(0.16, 1, 0.3, 1);
GSAP equivalents: ease:'elastic.out(1, 0.5)' or ease:'back.out(1.7)'

### 3D Tilt Cards
On mousemove: perspective(1000px) rotateY(x*15deg) rotateX(-y*15deg) scale3d(1.02).
Spring return on mouseleave.

### Glassmorphism Surfaces
.glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(16px) saturate(180%); border: 1px solid rgba(255,255,255,0.08); }

### GPU Compositing
will-change: transform, opacity on animated elements. Remove after animation (will-change: auto).
contain: layout style paint on cards for perf.

### SVG Noise Grain Overlay
body::after with feTurbulence SVG noise, opacity:0.4, mix-blend-mode:overlay, pointer-events:none.
`;

// ─── FRAMER-LEVEL DESIGN SYSTEM — Section Templates + Micro-Interactions ────

export const FRAMER_LEVEL_SYSTEM = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FRAMER-LEVEL DESIGN SYSTEM — MANDATORY RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 1. SPACING SYSTEM (use ONLY these values)
Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 80, 96, 128px
- Section padding: 80px or 96px vertical, 24px mobile
- Card gap: 24px or 32px
- Element gap: 8px, 12px, or 16px
- Container max-width: 1200px or 1280px, centered with margin:0 auto
- Lateral padding: 24px mobile, 48px tablet, 80px desktop

## 2. TYPOGRAPHY SYSTEM (fluid responsive with clamp)
\`\`\`css
:root {
  --font-display: 'Inter', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
}
h1 { font-size: clamp(2.5rem, 5vw, 4.5rem); line-height: 1.1; letter-spacing: -0.02em; font-weight: 700; }
h2 { font-size: clamp(1.8rem, 3.5vw, 3rem); line-height: 1.15; letter-spacing: -0.015em; font-weight: 700; }
h3 { font-size: clamp(1.25rem, 2vw, 1.75rem); line-height: 1.25; font-weight: 600; }
h4 { font-size: clamp(1.1rem, 1.5vw, 1.35rem); line-height: 1.3; font-weight: 600; }
p, body { font-size: 1rem; line-height: 1.6; font-weight: 400; color: var(--text-secondary); }
.text-lg { font-size: 1.125rem; line-height: 1.6; }
.text-sm { font-size: 0.875rem; line-height: 1.5; }
.caption { font-size: 0.75rem; letter-spacing: 0.05em; text-transform: uppercase; font-weight: 500; }
\`\`\`

## 3. BREAKPOINTS (responsive-first)
\`\`\`css
/* Mobile first */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md — tablet */ }
@media (min-width: 1024px) { /* lg — desktop */ }
@media (min-width: 1280px) { /* xl — wide */ }

/* Hamburger menu pattern */
.nav-links { display: none; }
.hamburger { display: flex; }
@media (min-width: 768px) {
  .nav-links { display: flex; gap: 32px; }
  .hamburger { display: none; }
}

/* Grid responsive */
.grid-features {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}
@media (min-width: 640px) { .grid-features { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1024px) { .grid-features { grid-template-columns: repeat(3, 1fr); } }
\`\`\`

## 4. MANDATORY PAGE ENTRANCE ANIMATION
\`\`\`css
/* Page loads with smooth reveal */
body { opacity: 0; transition: opacity 0.6s ease; }
body.loaded { opacity: 1; }
.fade-up { opacity: 0; transform: translateY(30px); transition: opacity 0.6s ease, transform 0.6s ease; }
.fade-up.visible { opacity: 1; transform: translateY(0); }
\`\`\`
\`\`\`js
// Page entrance + scroll reveal
document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('loaded');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
  }, { threshold: 0.1 });
  document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));
});
\`\`\`

## 5. SCROLL PROGRESS BAR
\`\`\`html
<div class="scroll-progress" id="scrollProgress"></div>
\`\`\`
\`\`\`css
.scroll-progress { position: fixed; top: 0; left: 0; height: 3px; background: var(--accent); z-index: 9999; transition: width 0.1s linear; width: 0%; }
\`\`\`
\`\`\`js
window.addEventListener('scroll', () => {
  const pct = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
  document.getElementById('scrollProgress').style.width = pct + '%';
});
\`\`\`

## 6. DARK/LIGHT MODE TOGGLE
\`\`\`css
:root { --bg: #ffffff; --text: #0f172a; --text-secondary: #475569; --surface: #f8fafc; --border: #e2e8f0; --accent: #6366f1; }
[data-theme="dark"] { --bg: #0a0a0a; --text: #f1f5f9; --text-secondary: #94a3b8; --surface: #111111; --border: #1e293b; --accent: #818cf8; }
body { background: var(--bg); color: var(--text); transition: background 0.3s, color 0.3s; }
\`\`\`
\`\`\`js
const themeToggle = document.getElementById('themeToggle');
themeToggle?.addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
  localStorage.setItem('theme', isDark ? 'light' : 'dark');
});
if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && matchMedia('(prefers-color-scheme: dark)').matches)) {
  document.documentElement.setAttribute('data-theme', 'dark');
}
\`\`\`

## 7. NOISE/GRAIN TEXTURE (premium feel)
\`\`\`css
body::after {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 9998;
  opacity: 0.4;
  mix-blend-mode: overlay;
}
\`\`\`

## 8. MICRO-INTERACTIONS
\`\`\`css
/* Button press effect */
.btn { transition: all 0.2s ease; }
.btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(99,102,241,0.3); }
.btn:active { transform: translateY(0) scale(0.98); }

/* Card hover lift */
.card { transition: transform 0.3s ease, box-shadow 0.3s ease; }
.card:hover { transform: translateY(-8px); box-shadow: 0 20px 40px rgba(0,0,0,0.1); }

/* Link underline animation */
.nav-link { position: relative; }
.nav-link::after { content: ''; position: absolute; bottom: -2px; left: 0; width: 0; height: 2px; background: var(--accent); transition: width 0.3s ease; }
.nav-link:hover::after { width: 100%; }

/* Input focus glow */
input:focus, textarea:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }

/* Smooth counter */
.counter { font-variant-numeric: tabular-nums; }
\`\`\`

## 9. CURSOR DOT FOLLOWER (premium sites)
\`\`\`css
.cursor-dot { width: 8px; height: 8px; background: var(--accent); border-radius: 50%; position: fixed; pointer-events: none; z-index: 10000; transition: transform 0.15s ease; mix-blend-mode: difference; }
.cursor-ring { width: 32px; height: 32px; border: 1.5px solid var(--accent); border-radius: 50%; position: fixed; pointer-events: none; z-index: 9999; transition: transform 0.3s ease, width 0.3s ease, height 0.3s ease; opacity: 0.5; }
@media (max-width: 768px) { .cursor-dot, .cursor-ring { display: none; } }
\`\`\`
\`\`\`js
const dot = document.querySelector('.cursor-dot');
const ring = document.querySelector('.cursor-ring');
if (dot && ring) {
  let mx = 0, my = 0, dx = 0, dy = 0;
  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; dot.style.transform = \\\`translate(\${mx - 4}px, \${my - 4}px)\\\`; });
  (function lerp() { dx += (mx - dx) * 0.15; dy += (my - dy) * 0.15; ring.style.transform = \\\`translate(\${dx - 16}px, \${dy - 16}px)\\\`; requestAnimationFrame(lerp); })();
  document.querySelectorAll('a, button, [role=button]').forEach(el => {
    el.addEventListener('mouseenter', () => { ring.style.width = '48px'; ring.style.height = '48px'; ring.style.transform = \\\`translate(\${dx - 24}px, \${dy - 24}px)\\\`; });
    el.addEventListener('mouseleave', () => { ring.style.width = '32px'; ring.style.height = '32px'; });
  });
}
\`\`\`

## 10. SECTION TEMPLATES — HERO VARIANTS

### Hero A: Video Background (cinematic)
\`\`\`html
<section class="hero">
  <div class="hero-video"><video autoplay muted loop playsinline src="__LTX_VIDEO_URL__"></video><div class="hero-overlay"></div></div>
  <div class="hero-content fade-up">
    <span class="caption">Subtitle tag</span>
    <h1>Main Headline</h1>
    <p class="text-lg">Supporting description text</p>
    <div class="hero-buttons"><a href="#" class="btn btn-primary">Get Started</a><a href="#" class="btn btn-outline">Learn More</a></div>
  </div>
</section>
\`\`\`

### Hero B: Split (text left, image right)
\`\`\`html
<section class="hero hero-split">
  <div class="hero-text fade-up"><span class="caption">Badge text</span><h1>Headline</h1><p>Description</p><a href="#" class="btn btn-primary">CTA</a></div>
  <div class="hero-media fade-up"><img src="..." alt="Hero"/></div>
</section>
\`\`\`

### Hero C: Centered with gradient mesh
\`\`\`html
<section class="hero hero-centered"><div class="aurora-bg"></div>
  <div class="hero-content fade-up"><span class="caption">Tag</span><h1>Centered Hero Headline</h1><p class="text-lg">Subtitle</p>
  <div class="hero-buttons"><a href="#" class="btn btn-primary">Primary CTA</a><a href="#" class="btn btn-ghost">Secondary</a></div></div>
</section>
\`\`\`

## 11. FEATURE SECTION TEMPLATES

### Features A: Icon Cards Grid (3 cols)
\`\`\`html
<section class="features"><div class="container">
  <div class="section-header fade-up"><span class="caption">Features</span><h2>Why Choose Us</h2><p>Description</p></div>
  <div class="grid-features">
    <div class="card fade-up"><div class="card-icon"><svg>...</svg></div><h3>Feature 1</h3><p>Description</p></div>
    <div class="card fade-up"><div class="card-icon"><svg>...</svg></div><h3>Feature 2</h3><p>Description</p></div>
    <div class="card fade-up"><div class="card-icon"><svg>...</svg></div><h3>Feature 3</h3><p>Description</p></div>
  </div>
</div></section>
\`\`\`

### Features B: Bento Grid (modern)
\`\`\`html
<section class="features"><div class="container">
  <div class="section-header fade-up"><h2>Features</h2></div>
  <div class="bento-grid">
    <div class="bento-item bento-large fade-up"><h3>Main Feature</h3><p>Description</p><img src="..." alt=""/></div>
    <div class="bento-item fade-up"><h3>Feature 2</h3><p>Desc</p></div>
    <div class="bento-item fade-up"><h3>Feature 3</h3><p>Desc</p></div>
    <div class="bento-item bento-wide fade-up"><h3>Feature 4</h3><p>Description</p></div>
  </div>
</div></section>
\`\`\`
\`\`\`css
.bento-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.bento-large { grid-column: span 2; grid-row: span 2; }
.bento-wide { grid-column: span 2; }
.bento-item { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 32px; overflow: hidden; }
@media (max-width: 768px) { .bento-grid { grid-template-columns: 1fr; } .bento-large, .bento-wide { grid-column: span 1; grid-row: span 1; } }
\`\`\`

### Features C: Alternating (image + text)
\`\`\`html
<section class="features-alt"><div class="container">
  <div class="feature-row fade-up"><div class="feature-text"><h3>Title</h3><p>Description</p></div><div class="feature-img"><img src="..." alt=""/></div></div>
  <div class="feature-row reverse fade-up"><div class="feature-text"><h3>Title</h3><p>Description</p></div><div class="feature-img"><img src="..." alt=""/></div></div>
</div></section>
\`\`\`

## 12. PRICING TABLE
\`\`\`html
<section class="pricing"><div class="container">
  <div class="section-header fade-up"><span class="caption">Pricing</span><h2>Simple, transparent pricing</h2></div>
  <div class="pricing-grid">
    <div class="pricing-card fade-up"><h3>Starter</h3><div class="price"><span class="amount">$9</span><span class="period">/mo</span></div><ul class="features-list"><li>Feature 1</li><li>Feature 2</li></ul><a href="#" class="btn btn-outline">Get Started</a></div>
    <div class="pricing-card featured fade-up"><div class="popular-badge">Most Popular</div><h3>Pro</h3><div class="price"><span class="amount">$29</span><span class="period">/mo</span></div><ul class="features-list"><li>Everything in Starter</li><li>Feature 3</li><li>Feature 4</li></ul><a href="#" class="btn btn-primary">Get Started</a></div>
    <div class="pricing-card fade-up"><h3>Enterprise</h3><div class="price"><span class="amount">$99</span><span class="period">/mo</span></div><ul class="features-list"><li>Everything in Pro</li><li>Feature 5</li></ul><a href="#" class="btn btn-outline">Contact Sales</a></div>
  </div>
</div></section>
\`\`\`

## 13. TESTIMONIAL SECTION
\`\`\`html
<section class="testimonials"><div class="container">
  <div class="section-header fade-up"><h2>What people say</h2></div>
  <div class="testimonial-grid">
    <div class="testimonial-card fade-up"><p class="quote">"Quote text..."</p><div class="author"><img src="..." alt="" class="avatar"/><div><strong>Name</strong><span>Title, Company</span></div></div></div>
  </div>
</div></section>
\`\`\`

## 14. PROFESSIONAL FOOTER
\`\`\`html
<footer class="footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-brand"><div class="logo">Brand</div><p>Short description of the brand.</p><div class="social-links"><a href="#" aria-label="Twitter"><svg>...</svg></a><a href="#" aria-label="GitHub"><svg>...</svg></a><a href="#" aria-label="LinkedIn"><svg>...</svg></a></div></div>
      <div class="footer-col"><h4>Product</h4><ul><li><a href="#">Features</a></li><li><a href="#">Pricing</a></li><li><a href="#">Changelog</a></li></ul></div>
      <div class="footer-col"><h4>Company</h4><ul><li><a href="#">About</a></li><li><a href="#">Blog</a></li><li><a href="#">Careers</a></li></ul></div>
      <div class="footer-col"><h4>Legal</h4><ul><li><a href="#">Privacy</a></li><li><a href="#">Terms</a></li></ul></div>
    </div>
    <div class="footer-bottom"><p>&copy; <script>document.write(new Date().getFullYear())</script> Brand. All rights reserved.</p></div>
  </div>
</footer>
\`\`\`
\`\`\`css
.footer { background: var(--surface); border-top: 1px solid var(--border); padding: 64px 24px 32px; }
.footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 48px; max-width: 1200px; margin: 0 auto; }
.footer-col h4 { font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; color: var(--text); }
.footer-col ul { list-style: none; padding: 0; } .footer-col li { margin-bottom: 8px; }
.footer-col a { color: var(--text-secondary); text-decoration: none; transition: color 0.2s; } .footer-col a:hover { color: var(--accent); }
.social-links { display: flex; gap: 12px; margin-top: 16px; }
.social-links a { width: 36px; height: 36px; border-radius: 8px; background: var(--border); display: flex; align-items: center; justify-content: center; color: var(--text-secondary); transition: all 0.2s; }
.social-links a:hover { background: var(--accent); color: #fff; }
.footer-bottom { border-top: 1px solid var(--border); margin-top: 48px; padding-top: 24px; text-align: center; color: var(--text-secondary); font-size: 0.875rem; }
@media (max-width: 768px) { .footer-grid { grid-template-columns: 1fr 1fr; gap: 32px; } }
@media (max-width: 480px) { .footer-grid { grid-template-columns: 1fr; } }
\`\`\`

## 15. INTERACTIVE COMPONENTS

### FAQ Accordion
\`\`\`html
<section class="faq"><div class="container">
  <div class="section-header fade-up"><h2>Frequently Asked Questions</h2></div>
  <div class="accordion">
    <div class="accordion-item fade-up"><button class="accordion-trigger"><span>Question 1?</span><svg class="accordion-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></button><div class="accordion-content"><p>Answer text...</p></div></div>
  </div>
</div></section>
\`\`\`
\`\`\`js
document.querySelectorAll('.accordion-trigger').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.parentElement;
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.accordion-item.open').forEach(i => i.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  });
});
\`\`\`
\`\`\`css
.accordion-item { border-bottom: 1px solid var(--border); }
.accordion-trigger { width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 20px 0; background: none; border: none; cursor: pointer; font-size: 1.1rem; font-weight: 500; color: var(--text); text-align: left; }
.accordion-icon { transition: transform 0.3s ease; }
.accordion-item.open .accordion-icon { transform: rotate(180deg); }
.accordion-content { max-height: 0; overflow: hidden; transition: max-height 0.4s ease, padding 0.3s ease; }
.accordion-item.open .accordion-content { max-height: 200px; padding-bottom: 20px; }
\`\`\`

### Tab Switcher
\`\`\`html
<div class="tabs">
  <div class="tab-list"><button class="tab active" data-tab="tab1">Tab 1</button><button class="tab" data-tab="tab2">Tab 2</button><button class="tab" data-tab="tab3">Tab 3</button><div class="tab-indicator"></div></div>
  <div class="tab-content active" id="tab1">Content 1</div>
  <div class="tab-content" id="tab2">Content 2</div>
  <div class="tab-content" id="tab3">Content 3</div>
</div>
\`\`\`
\`\`\`js
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab).classList.add('active');
  });
});
\`\`\`

### Testimonial Auto-Carousel
\`\`\`js
const track = document.querySelector('.carousel-track');
const slides = document.querySelectorAll('.carousel-slide');
let idx = 0;
setInterval(() => { idx = (idx + 1) % slides.length; track.style.transform = \\\`translateX(-\${idx * 100}%)\\\`; }, 4000);
\`\`\`

## 16. HEADING REVEAL ANIMATIONS (MANDATORY for h1/h2)
Every h1 and h2 MUST have a reveal animation. Choose one:

### Split-word blur reveal:
\`\`\`js
document.querySelectorAll('h1, h2').forEach(heading => {
  const words = heading.textContent.split(' ');
  heading.innerHTML = words.map((w, i) => '<span class="reveal-word" style="--i:'+i+'">'+w+'</span>').join(' ');
});
\`\`\`
\`\`\`css
.reveal-word { display: inline-block; opacity: 0; filter: blur(8px); transform: translateY(20px); animation: wordReveal 0.5s ease forwards; animation-delay: calc(var(--i) * 0.08s); }
.fade-up .reveal-word { animation-play-state: paused; }
.fade-up.visible .reveal-word { animation-play-state: running; }
@keyframes wordReveal { to { opacity: 1; filter: blur(0); transform: translateY(0); } }
\`\`\`

## 17. GRADIENT MESH BACKGROUND (use on hero for tech/SaaS)
\`\`\`css
.aurora-bg {
  position: absolute; inset: 0; overflow: hidden; z-index: 0;
}
.aurora-bg::before, .aurora-bg::after {
  content: ''; position: absolute; width: 60vw; height: 60vw; border-radius: 50%; filter: blur(80px); opacity: 0.15;
}
.aurora-bg::before { background: var(--accent); top: -20%; left: -10%; animation: float1 15s ease-in-out infinite alternate; }
.aurora-bg::after { background: #ec4899; bottom: -20%; right: -10%; animation: float2 18s ease-in-out infinite alternate; }
@keyframes float1 { to { transform: translate(30%, 30%) scale(1.2); } }
@keyframes float2 { to { transform: translate(-30%, -30%) scale(1.1); } }
\`\`\`

## 18. COMMON BUTTON STYLES
\`\`\`css
.btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 28px; border-radius: 8px; font-weight: 500; font-size: 0.95rem; border: none; cursor: pointer; transition: all 0.2s ease; text-decoration: none; }
.btn-primary { background: var(--accent); color: #fff; }
.btn-primary:hover { filter: brightness(1.1); transform: translateY(-2px); box-shadow: 0 8px 25px rgba(99,102,241,0.3); }
.btn-outline { background: transparent; border: 1.5px solid var(--border); color: var(--text); }
.btn-outline:hover { border-color: var(--accent); color: var(--accent); }
.btn-ghost { background: transparent; color: var(--accent); padding: 12px 16px; }
.btn-ghost:hover { background: rgba(99,102,241,0.08); }
\`\`\`

## 19. NAVBAR PATTERN
\`\`\`css
.navbar { position: fixed; top: 0; left: 0; right: 0; z-index: 1000; padding: 16px 24px; backdrop-filter: blur(12px) saturate(180%); background: rgba(var(--bg-rgb, 255,255,255), 0.8); border-bottom: 1px solid var(--border); transition: all 0.3s ease; }
.navbar.scrolled { padding: 12px 24px; box-shadow: 0 1px 10px rgba(0,0,0,0.05); }
.navbar-inner { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; }
\`\`\`
\`\`\`js
window.addEventListener('scroll', () => {
  document.querySelector('.navbar')?.classList.toggle('scrolled', window.scrollY > 50);
});
\`\`\`

## RULES FOR AI SITE GENERATION:
1. EVERY site MUST use the spacing system (section padding 80-96px, card gap 24-32px)
2. EVERY h1/h2 MUST have a reveal animation (blur-fade, word-by-word, or slide-up)
3. EVERY section MUST have .fade-up class + IntersectionObserver reveal
4. Include scroll progress bar on premium/long-scroll sites
5. Include noise texture overlay on dark theme sites
6. Use clamp() for ALL font sizes — never fixed px for headings
7. Mobile hamburger menu is MANDATORY at max-width:768px
8. All buttons: min-height 44px, hover translateY(-2px), active scale(0.98)
9. All cards: hover translateY(-8px) + enhanced shadow
10. Footer MUST have multi-column grid + social icons + copyright with dynamic year
11. Use CSS custom properties (--bg, --text, --accent, --surface, --border) for theming
12. Page entrance animation (body opacity 0→1) is MANDATORY
13. Include @media (prefers-reduced-motion: reduce) to disable all animations
14. Cursor dot follower on portfolio/agency/creative sites
15. Dark/light toggle on tech/SaaS sites when appropriate
`;

