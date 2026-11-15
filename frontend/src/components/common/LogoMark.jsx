import { useId } from 'react';

// PhoneShopAI mark: a champagne-gold "P" whose bowl is cut into a four-point AI spark,
// with a small spark beside the stem. Colors come from tokens.css so the mark follows the theme.
export default function LogoMark({ className = '', title }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const gold = `${id}-gold`;
  const tile = `${id}-tile`;

  return (
    <svg
      className={`logo-mark ${className}`.trim()}
      viewBox="0 0 64 64"
      role={title ? 'img' : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <defs>
        <linearGradient id={tile} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--color-graphite-soft)' }} />
          <stop offset="1" style={{ stopColor: 'var(--color-graphite-deep)' }} />
        </linearGradient>
        <linearGradient id={gold} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--color-ink-deep)' }} />
          <stop offset="0.38" style={{ stopColor: 'var(--color-gold-bright)' }} />
          <stop offset="0.7" style={{ stopColor: 'var(--color-gold)' }} />
          <stop offset="1" style={{ stopColor: 'var(--color-champagne)' }} />
        </linearGradient>
      </defs>
      <rect className="logo-mark-tile" x="1" y="1" width="62" height="62" rx="16" fill={`url(#${tile})`} />
      <rect x="1.75" y="1.75" width="60.5" height="60.5" rx="15.25" fill="none" stroke={`url(#${gold})`} strokeOpacity="0.5" strokeWidth="1.5" />
      <path
        fill={`url(#${gold})`}
        fillRule="evenodd"
        d="M17 11H35A15 15 0 0 1 35 41H25V49A2 2 0 0 1 23 51H17A2 2 0 0 1 15 49V13A2 2 0 0 1 17 11Z
           M35.5 17.5Q37.1 24.4 44 26Q37.1 27.6 35.5 34.5Q33.9 27.6 27 26Q33.9 24.4 35.5 17.5Z"
      />
      <path
        className="logo-mark-spark"
        fill={`url(#${gold})`}
        d="M45 43Q46 47 50 48Q46 49 45 53Q44 49 40 48Q44 47 45 43Z"
      />
    </svg>
  );
}
