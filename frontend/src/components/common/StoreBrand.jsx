import { Link } from 'react-router-dom';
import { useStoreSettings } from '../../hooks/useStoreSettings';

function BrandName({ name }) {
  const matchIndex = name.toLowerCase().lastIndexOf('phone');
  if (matchIndex <= 0) return name;
  return <>{name.slice(0, matchIndex)}<span>{name.slice(matchIndex)}</span></>;
}

export default function StoreBrand({ className = '', onClick }) {
  const settings = useStoreSettings();
  const initial = settings.storeName.trim().charAt(0).toUpperCase() || 'T';

  return (
    <Link className={`brand ${className}`.trim()} to="/" onClick={onClick}>
      {settings.logo
        ? <img className="brand-logo" src={settings.logo} alt={settings.storeName} />
        : <span className="brand-mark">{initial}</span>}
      <span><BrandName name={settings.storeName} /></span>
    </Link>
  );
}
