import { useId } from 'react';

// Gold robot mascot for the AI assistant. Motion (blink, antenna pulse, look-around while
// thinking, float) lives in luxe.css and is switched off under prefers-reduced-motion.
export default function RobotMascot({ className = '', thinking = false, float = false }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const shell = `${id}-shell`;
  const visor = `${id}-visor`;
  const glow = `${id}-glow`;
  const classes = ['robot-mascot', thinking && 'is-thinking', float && 'is-floating', className]
    .filter(Boolean)
    .join(' ');

  return (
    <svg className={classes} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={shell} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--color-ink-deep)' }} />
          <stop offset="0.35" style={{ stopColor: 'var(--color-gold-bright)' }} />
          <stop offset="0.75" style={{ stopColor: 'var(--color-gold)' }} />
          <stop offset="1" style={{ stopColor: 'var(--color-champagne)' }} />
        </linearGradient>
        <linearGradient id={visor} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--color-graphite-soft)' }} />
          <stop offset="1" style={{ stopColor: 'var(--color-graphite-deep)' }} />
        </linearGradient>
        <filter id={glow} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path d="M32 14V8" fill="none" strokeWidth="2.4" strokeLinecap="round" style={{ stroke: 'var(--color-gold)' }} />
      <circle className="robot-antenna" cx="32" cy="6" r="3.4" filter={`url(#${glow})`} style={{ fill: 'var(--color-gold-bright)' }} />

      <rect x="4.5" y="27" width="6.5" height="13" rx="3.25" style={{ fill: 'var(--color-gold)' }} />
      <rect x="53" y="27" width="6.5" height="13" rx="3.25" style={{ fill: 'var(--color-gold)' }} />
      <rect x="24" y="49" width="16" height="7" rx="3" style={{ fill: 'var(--color-gold)' }} />

      <rect x="9" y="13" width="46" height="38" rx="14" fill={`url(#${shell})`} />
      <path d="M15 22C16.5 17.5 20 15.5 25 15.5" fill="none" strokeWidth="2" strokeLinecap="round" opacity="0.7" style={{ stroke: 'var(--color-static-white)' }} />

      <rect x="15" y="21" width="34" height="23" rx="10" fill={`url(#${visor})`} />
      <g className="robot-eyes" filter={`url(#${glow})`} style={{ fill: 'var(--color-gold-bright)' }}>
        <rect className="robot-eye" x="22" y="27" width="6" height="8.5" rx="3" />
        <rect className="robot-eye" x="36" y="27" width="6" height="8.5" rx="3" />
      </g>
      <path d="M28.5 39Q32 41.6 35.5 39" fill="none" strokeWidth="1.8" strokeLinecap="round" style={{ stroke: 'var(--color-champagne)' }} />
      <circle cx="19.5" cy="39" r="1.7" opacity="0.65" style={{ fill: 'var(--color-rose-gold-bright)' }} />
      <circle cx="44.5" cy="39" r="1.7" opacity="0.65" style={{ fill: 'var(--color-rose-gold-bright)' }} />
    </svg>
  );
}
