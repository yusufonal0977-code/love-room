import { useEffect, useState } from 'react';
import { serverNow } from '../state/room';

/** Sunucu saatine göre "şimdi". `active` iken `intervalMs` aralıkla yeniden render eder. */
export function useNow(active: boolean, intervalMs = 500) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    setNow(serverNow());
    if (!active) return;
    const id = setInterval(() => setNow(serverNow()), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);
  return now;
}
