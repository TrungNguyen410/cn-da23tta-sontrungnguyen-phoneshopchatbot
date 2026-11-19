// Holo orb mascot for the AI assistant: a glossy violet sphere with two glowing eyes.
// Motion (blink, float, look-around while thinking) lives in holo.css and is switched off
// under prefers-reduced-motion.
export default function RobotMascot({ className = '', thinking = false, float = false }) {
  const classes = ['robot-mascot', 'holo-orb', thinking && 'is-thinking', float && 'is-floating', className]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} aria-hidden="true">
      <span className="holo-orb-eyes"><i /><i /></span>
    </span>
  );
}
