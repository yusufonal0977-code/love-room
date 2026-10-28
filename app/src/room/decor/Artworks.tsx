// Çerçevelere henüz fotoğraf konmadığında asılı duran varsayılan resimler.
// Boş "ekle" kutusu yerine gerçek bir ev duvarı gibi görünmeleri için.
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import type { ReactElement } from 'react';
import type { FrameId } from '@loveroom/shared';
import { useUid } from './useUid';

/** Gün batımında tepeler (yağlı boya hissi). */
function Sunset() {
  const id = useUid('art-sun');
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 120" preserveAspectRatio="xMidYMid slice">
      <Defs>
        <LinearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#f6d6a8" />
          <Stop offset="0.6" stopColor="#efa477" />
          <Stop offset="1" stopColor="#d9785a" />
        </LinearGradient>
      </Defs>
      <Rect width="100" height="120" fill={`url(#${id}-sky)`} />
      <Circle cx="62" cy="56" r="14" fill="#fbe7c2" opacity={0.95} />
      <Path d="M0 74 Q22 58 44 70 Q66 52 100 66 L100 120 L0 120 Z" fill="#b5654a" />
      <Path d="M0 88 Q30 72 58 86 Q80 76 100 84 L100 120 L0 120 Z" fill="#8a4a3a" />
      <Path d="M0 102 Q36 92 70 102 Q86 98 100 100 L100 120 L0 120 Z" fill="#5d3a2e" />
      {[14, 22, 30].map((x) => (
        <Path key={x} d={`M${x} 98 L${x + 3} 84 L${x + 6} 98 Z`} fill="#3f2a22" />
      ))}
    </Svg>
  );
}

/** Botanik çizim: krem zemin üzerinde yapraklar. */
function Botanical() {
  const id = useUid('art-bot');
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 120" preserveAspectRatio="xMidYMid slice">
      <Defs>
        <LinearGradient id={`${id}-leaf`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#9db38f" />
          <Stop offset="1" stopColor="#5f7a58" />
        </LinearGradient>
      </Defs>
      <Rect width="100" height="120" fill="#f4ecdf" />
      <Path d="M50 112 Q48 70 52 18" stroke="#6b5440" strokeWidth="1.4" fill="none" />
      {[
        [40, 30, -40], [62, 38, 40], [38, 52, -35], [64, 60, 35], [40, 74, -30], [62, 82, 30], [52, 18, 0],
      ].map(([x, y, r], i) => (
        <G key={i} transform={`rotate(${r} ${x} ${y})`}>
          <Ellipse cx={x} cy={y} rx="8" ry="14" fill={`url(#${id}-leaf)`} />
          <Path d={`M${x} ${y - 12} L${x} ${y + 12}`} stroke="rgba(255,255,255,0.4)" strokeWidth="0.7" />
        </G>
      ))}
      <Circle cx="78" cy="22" r="6" fill="#e3a752" opacity={0.75} />
    </Svg>
  );
}

/** Polaroid: deniz kenarında iki şezlong. */
function Sea() {
  const id = useUid('art-sea');
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
      <Defs>
        <LinearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#bcd8e6" />
          <Stop offset="1" stopColor="#f3e4d0" />
        </LinearGradient>
      </Defs>
      <Rect width="100" height="100" fill={`url(#${id}-sky)`} />
      <Rect y="52" width="100" height="18" fill="#6f9fb4" />
      <Rect y="56" width="100" height="2" fill="#a9cbd8" />
      <Rect y="70" width="100" height="30" fill="#e8d2ae" />
      <Path d="M24 84 L38 72 M30 84 L44 72" stroke="#c8664a" strokeWidth="3" strokeLinecap="round" />
      <Path d="M52 84 L66 72 M58 84 L72 72" stroke="#5b7fa6" strokeWidth="3" strokeLinecap="round" />
      <Circle cx="78" cy="24" r="7" fill="#fff4d6" />
    </Svg>
  );
}

/** Polaroid: gece şehir ışıkları. */
function CityNight() {
  const id = useUid('art-city');
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
      <Defs>
        <LinearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#1f2a4a" />
          <Stop offset="1" stopColor="#8a5a6a" />
        </LinearGradient>
      </Defs>
      <Rect width="100" height="100" fill={`url(#${id}-sky)`} />
      <Circle cx="24" cy="22" r="6" fill="#fbe9c4" />
      {[
        [6, 56, 14, 44], [22, 44, 12, 56], [36, 62, 16, 38], [54, 38, 12, 62], [68, 54, 14, 46], [84, 48, 12, 52],
      ].map(([x, y, w, h], i) => (
        <G key={i}>
          <Rect x={x} y={y} width={w} height={h} fill="#2a2238" />
          {[0, 1, 2, 3].map((r) => (
            <Rect key={r} x={x + 3 + ((r + i) % 2) * 5} y={y + 5 + r * 8} width="2.4" height="3" fill="#ffd27a" opacity={0.85} />
          ))}
        </G>
      ))}
    </Svg>
  );
}

const ART: Record<FrameId, () => ReactElement> = {
  'frame-left-1': Sunset,
  'frame-left-2': Botanical,
  'photo-right-1': Sea,
  'photo-right-2': CityNight,
};

export function DefaultArt({ id }: { id: FrameId }) {
  const Art = ART[id];
  return <Art />;
}
