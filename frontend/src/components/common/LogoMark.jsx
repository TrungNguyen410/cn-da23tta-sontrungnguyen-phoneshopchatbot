// PhoneShopAI mark: a small CSS 3D cube (violet front, cyan side, lime top) carrying a "P".
// Colors come from tokens.css through holo.css, so the mark follows the theme.
export default function LogoMark({ className = '', title }) {
  return (
    <span
      className={`logo-mark logo-cube ${className}`.trim()}
      role={title ? 'img' : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
    >
      <i />
      <i />
      <i />
      <b>P</b>
    </span>
  );
}
