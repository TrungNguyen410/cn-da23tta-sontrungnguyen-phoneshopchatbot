import { useEffect, useState } from 'react';
import { loadWards } from '../utils/wards';

// Ward/commune names of one province; empty until the data chunk has loaded.
export function useWards(province) {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    loadWards()
      .then((wards) => { if (active) setData(wards); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);

  return {
    wards: (province && data?.[province]) || [],
    ready: Boolean(data),
    failed,
  };
}
