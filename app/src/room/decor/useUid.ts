import { useMemo } from 'react';

/** SVG gradyan kimlikleri web'de sayfa genelinde tekil olmalı; her bileşen örneğine kısa bir önek üretir. */
export function useUid(prefix: string) {
  return useMemo(() => `${prefix}-${Math.random().toString(36).slice(2, 8)}`, [prefix]);
}
