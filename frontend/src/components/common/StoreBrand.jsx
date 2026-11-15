import { Link } from 'react-router-dom';
import { useStoreSettings } from '../../hooks/useStoreSettings';
import LogoMark from './LogoMark';

// Highlights the trailing "AI" (PhoneShopAI) or, for older names, the "Phone" part (TechPhone).
function BrandName({ name }) {
  if (/\S+AI$/.test(name)) return <>{name.slice(0, -2)}<span>AI</span></>;
  const matchIndex = name.toLowerCase().lastIndexOf('phone');
  if (matchIndex <= 0) return name;
  return <>{name.slice(0, matchIndex)}<span>{name.slice(matchIndex)}</span></>;
}

export default function StoreBrand({ className = '', onClick }) {
  const settings = useStoreSettings();

  return (
    <Link className={`brand ${className}`.trim()} to="/" onClick={onClick}>
      {settings.logo
        ? <img className="brand-logo" src={settings.logo} alt={settings.storeName} />
        : <LogoMark className="brand-logo-mark" />}
      <span><BrandName name={settings.storeName} /></span>
    </Link>
  );
}
