import Phone3D from '../common/Phone3D';
import RobotMascot from '../chat/RobotMascot';

// Decorative 3D scene for the left side of the sign-in / sign-up pages.
export default function AuthShowcase() {
  return (
    <div className="auth-showcase" aria-hidden="true">
      <span className="auth-showcase-floor" />
      <span className="auth-showcase-chip"><RobotMascot /><span><b>Trợ lý AI</b><small>tư vấn chọn máy theo nhu cầu của bạn</small></span></span>
      <Phone3D className="auth-phone auth-phone-left" tone="pink" ry={24} rx={6} rz={-6} layers={8} />
      <Phone3D className="auth-phone auth-phone-right" tone="teal" ry={150} rx={8} rz={6} layers={8} />
      <Phone3D className="auth-phone auth-phone-center" tone="violet" ry={-14} rx={6} rz={-3} layers={10} />
    </div>
  );
}
