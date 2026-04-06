import type { VirtualFS, Message } from '@/lib/types';

export function computeSmartSuggestions(projectFiles: VirtualFS): { title: string; desc: string }[] {
  const fileNames = Object.keys(projectFiles);
  const allContent = Object.values(projectFiles).map(f => f.content).join('\n').toLowerCase();
  const hasFiles = fileNames.length > 0;
  const hasHtml = fileNames.some(f => f.endsWith('.html'));
  const hasCss = fileNames.some(f => f.endsWith('.css')) || allContent.includes('<style');
  const hasJs = fileNames.some(f => f.endsWith('.js') || f.endsWith('.ts'));
  const hasResponsive = allContent.includes('@media') || allContent.includes('responsive');
  const hasDarkMode = allContent.includes('dark-mode') || allContent.includes('prefers-color-scheme') || allContent.includes('dark:');
  const hasAnimation = allContent.includes('animation') || allContent.includes('gsap') || allContent.includes('lenis');
  const hasNav = allContent.includes('<nav') || allContent.includes('navbar');
  const hasFooter = allContent.includes('<footer');
  const hasForm = allContent.includes('<form') || allContent.includes('<input');
  const hasAuth = allContent.includes('login') || allContent.includes('signup') || allContent.includes('auth');

  if (!hasFiles) {
    return [
      { title: 'SaaS Landing Page', desc: 'Modern landing page with hero, pricing & testimonials' },
      { title: 'Dashboard App', desc: 'Analytics dashboard with data charts' },
      { title: 'Portfolio Site', desc: 'Personal portfolio with projects showcase' },
    ];
  }

  const suggestions: { title: string; desc: string }[] = [];
  if (hasHtml && !hasResponsive) suggestions.push({ title: 'Make Responsive', desc: 'Add mobile/tablet breakpoints' });
  if (hasHtml && !hasDarkMode) suggestions.push({ title: 'Add Dark Mode', desc: 'Toggle + prefers-color-scheme' });
  if (hasHtml && !hasAnimation) suggestions.push({ title: 'Add Animations', desc: 'GSAP scroll + hover animations' });
  if (hasHtml && !hasNav) suggestions.push({ title: 'Add Navigation', desc: 'Sticky navbar with smooth scroll' });
  if (hasHtml && !hasFooter) suggestions.push({ title: 'Add Footer', desc: 'Footer with links & social icons' });
  if (hasHtml && !hasForm) suggestions.push({ title: 'Add Contact Form', desc: 'Form with validation & submit' });
  if (!hasCss) suggestions.push({ title: 'Add Custom CSS', desc: 'Styling & design polish' });
  if (!hasJs) suggestions.push({ title: 'Add Interactivity', desc: 'JS logic for dynamic behavior' });
  if (hasForm && !hasAuth) suggestions.push({ title: 'Add Auth Pages', desc: 'Login & signup flow' });
  if (hasHtml && hasCss && hasJs) suggestions.push({ title: 'Performance Audit', desc: 'Optimize speed & bundle size' });

  return suggestions.slice(0, 3);
}

export function computeFollowUpSuggestions(messages: Message[], isStreaming: boolean): string[] {
  if (isStreaming || messages.length < 2) return [];
  const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
  if (!lastAssistant?.content) return [];
  const content = lastAssistant.content.toLowerCase();
  const chips: string[] = [];

  if (content.includes('```html') || content.includes('```jsx') || content.includes('```tsx')) {
    if (!content.includes('dark')) chips.push('Add dark mode toggle');
    if (!content.includes('animation') && !content.includes('motion')) chips.push('Add animations');
    if (!content.includes('responsive') && !content.includes('@media')) chips.push('Make it responsive');
    if (!content.includes('loading') && !content.includes('skeleton')) chips.push('Add loading states');
    chips.push('Improve the design');
    chips.push('Add more sections');
  } else if (content.includes('```css')) {
    chips.push('Add hover effects');
    chips.push('Add transitions');
    chips.push('Make it responsive');
  } else if (content.includes('```')) {
    chips.push('Explain this code');
    chips.push('Add error handling');
    chips.push('Optimize performance');
  } else {
    chips.push('Show me the code');
    chips.push('Give me more details');
    chips.push('Create a prototype');
  }
  return chips.slice(0, 4);
}
