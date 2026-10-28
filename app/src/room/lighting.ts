import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Saate göre oda ışığı. Duvarlar ve eşyalar her zaman gündüz renginde çizilir; akşam ve gece
 * havası üstlerine binen katmanlarla (karanlık, altın ton) ve lamba/şömine ışık havuzlarıyla oluşur.
 * Değerler saat boyunca yumuşakça geçiş yapar.
 */
export interface Lighting {
  hour: number;
  /** 0–1: gece karanlığı katmanının gücü. */
  night: number;
  /** 0–1: akşamüstü altın ton. */
  golden: number;
  /** 0–1: sabah serinliği/pembe ton. */
  morning: number;
  /** 0–1: lambaların, mumların ve peri ışıklarının parlaklığı. */
  lamps: number;
  /** 0–1: pencereden giren gün ışığı. */
  daylight: number;
  sky: 'dawn' | 'day' | 'golden' | 'dusk' | 'night';
}

type Curve = [hour: number, value: number][];

const NIGHT: Curve = [[0, 0.6], [5, 0.6], [6.5, 0.32], [8, 0], [16.5, 0], [18, 0.1], [19.5, 0.32], [21, 0.52], [24, 0.6]];
const GOLDEN: Curve = [[0, 0], [15.5, 0], [17, 0.2], [18.5, 0.28], [19.5, 0.12], [20.5, 0], [24, 0]];
const MORNING: Curve = [[0, 0], [5.5, 0], [7, 0.16], [9, 0], [24, 0]];
const LAMPS: Curve = [[0, 1], [6, 1], [8, 0.12], [16, 0.12], [18, 0.55], [19.5, 1], [24, 1]];
const DAYLIGHT: Curve = [[0, 0], [6, 0], [8, 0.85], [15, 0.85], [18.5, 0.55], [19.8, 0], [24, 0]];

function sample(curve: Curve, h: number) {
  for (let i = 1; i < curve.length; i++) {
    const [h1, v1] = curve[i];
    const [h0, v0] = curve[i - 1];
    if (h <= h1) return v0 + ((v1 - v0) * (h - h0)) / (h1 - h0 || 1);
  }
  return curve[curve.length - 1][1];
}

export function lightingAt(hour: number): Lighting {
  const h = ((hour % 24) + 24) % 24;
  const sky: Lighting['sky'] =
    h < 5.5 || h >= 20.5 ? 'night' : h < 8 ? 'dawn' : h < 16.5 ? 'day' : h < 19.3 ? 'golden' : 'dusk';
  return {
    hour: h,
    night: sample(NIGHT, h),
    golden: sample(GOLDEN, h),
    morning: sample(MORNING, h),
    lamps: sample(LAMPS, h),
    daylight: sample(DAYLIGHT, h),
    sky,
  };
}

/** Önizleme: web'de adrese ?saat=21 (ya da 7.5) eklenirse o saat gösterilir. */
function overrideHour(): number | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const v = new URLSearchParams(window.location.search).get('saat');
  const n = v === null ? NaN : Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

const currentHour = () => {
  const o = overrideHour();
  if (o !== null) return o;
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60;
};

/** Yerel saate göre ışık; dakikada bir güncellenir. */
export function useLighting(): Lighting {
  const [hour, setHour] = useState(currentHour);
  useEffect(() => {
    const id = setInterval(() => setHour(currentHour()), 60_000);
    return () => clearInterval(id);
  }, []);
  return lightingAt(hour);
}
