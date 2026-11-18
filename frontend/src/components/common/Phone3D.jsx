// Decorative CSS-only 3D phone (Holo Prism). Thickness comes from stacked edge layers,
// colors from the tone-* classes in holo.css (which read tokens.css). Hidden from assistive tech.
const TONES = ['violet', 'pink', 'teal', 'amber', 'blue', 'graphite', 'lime', 'indigo', 'grape', 'sand'];

const dateLabel = () => {
  try {
    return new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  } catch {
    return '';
  }
};

export const phoneTone = (seed = '') => {
  const text = String(seed);
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  return TONES[hash % TONES.length];
};

export default function Phone3D({
  tone = 'violet',
  ry = -24,
  rx = 8,
  rz = 0,
  layers = 8,
  clock = true,
  className = '',
}) {
  const count = Math.max(2, layers);
  const edges = Array.from({ length: count }, (_, index) => -0.5 + index / (count - 1));
  const style = { '--ry': `${ry}deg`, '--rx': `${rx}deg`, '--rz': `${rz}deg` };

  return (
    <span className={`phone3d tone-${tone} ${className}`.trim()} style={style} aria-hidden="true">
      {edges.map((depth) => (
        <span
          key={depth}
          className="phone3d-edge"
          style={{ transform: `translateZ(calc(var(--d) * ${depth.toFixed(3)}))` }}
        />
      ))}
      <span className="phone3d-back"><span className="phone3d-cam"><i /><i /><i /></span></span>
      <span className="phone3d-front">
        <span className="phone3d-screen">
          <span className="phone3d-island" />
          {clock && (
            <>
              <span className="phone3d-date">{dateLabel()}</span>
              <span className="phone3d-clock">09:41</span>
            </>
          )}
          <span className="phone3d-blob" />
        </span>
      </span>
    </span>
  );
}
