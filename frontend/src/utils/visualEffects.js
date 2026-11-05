// Purely decorative motion for the Noir & Gold theme.
// - Pointer tilt: writes CSS variables (--nb-rx, --nb-ry, --nb-mx, --nb-my) on cards so CSS can rotate them in 3D.
// - Scroll reveal: adds .nb-reveal / .is-in classes so sections rise into view.
// Nothing here reads or changes app state, routes or data. Skipped entirely for reduced-motion users.

const TILT_SELECTOR = '.product-card, .category-card, .stat-card, .hero-slider';
const REVEAL_SELECTOR = [
  '.section-heading',
  '.product-card',
  '.category-card',
  '.benefit-grid > div',
  '.story-stats > div',
  '.page-hero',
  '.panel:not(.chat-panel):not(.support-panel)',
  '.admin-card',
  '.admin-table-card',
  '.stat-card',
  '.dashboard-welcome',
].join(', ');
const MAX_TILT = { '.hero-slider': 4, default: 9 };

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const hasFinePointer = () => window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false;

function setupTilt() {
  let active = null;
  let frame = 0;
  let lastEvent = null;

  const reset = (element) => {
    if (!element) return;
    ['--nb-rx', '--nb-ry', '--nb-mx', '--nb-my'].forEach((name) => element.style.removeProperty(name));
  };

  const apply = () => {
    frame = 0;
    if (!active || !lastEvent) return;
    const rect = active.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = (lastEvent.clientX - rect.left) / rect.width - 0.5;
    const y = (lastEvent.clientY - rect.top) / rect.height - 0.5;
    const max = active.matches('.hero-slider') ? MAX_TILT['.hero-slider'] : MAX_TILT.default;
    active.style.setProperty('--nb-ry', `${(x * max * 2).toFixed(2)}deg`);
    active.style.setProperty('--nb-rx', `${(-y * max * 2).toFixed(2)}deg`);
    active.style.setProperty('--nb-mx', (x * 2).toFixed(3));
    active.style.setProperty('--nb-my', (y * 2).toFixed(3));
  };

  document.addEventListener('pointermove', (event) => {
    if (event.pointerType && event.pointerType !== 'mouse') return;
    const target = event.target instanceof Element ? event.target.closest(TILT_SELECTOR) : null;
    if (target !== active) {
      reset(active);
      active = target;
    }
    if (!active) return;
    lastEvent = event;
    if (!frame) frame = requestAnimationFrame(apply);
  }, { passive: true });

  document.addEventListener('pointerleave', () => {
    reset(active);
    active = null;
  });
}

function setupReveal() {
  if (!('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });

  const scan = (root) => {
    const elements = root.querySelectorAll ? root.querySelectorAll(REVEAL_SELECTOR) : [];
    elements.forEach((element) => {
      if (element.classList.contains('nb-reveal')) return;
      if (element.closest('[role="dialog"], .modal, .chat-widget, .support-launcher')) return;
      const siblings = element.parentElement ? Array.from(element.parentElement.children) : [];
      const index = Math.max(0, siblings.indexOf(element));
      element.style.setProperty('--nb-delay', `${Math.min(index, 8) * 70}ms`);
      element.classList.add('nb-reveal');
      const rect = element.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        requestAnimationFrame(() => element.classList.add('is-in'));
      } else {
        observer.observe(element);
      }
    });
  };

  scan(document);
  let pending = 0;
  new MutationObserver(() => {
    if (pending) return;
    pending = requestAnimationFrame(() => {
      pending = 0;
      scan(document);
    });
  }).observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
}

export function initializeVisualEffects() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (prefersReducedMotion()) return;
  if (hasFinePointer()) setupTilt();
  setupReveal();
}
