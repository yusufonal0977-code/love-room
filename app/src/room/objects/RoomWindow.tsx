import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import type { Lighting } from '../lighting';
import { useUid } from '../decor/useUid';
import { Focusable } from './Focusable';
import { AspectBox } from './AspectBox';

const SKIES: Record<Lighting['sky'], [string, string]> = {
  dawn: ['#9fb4d8', '#f6c9b4'],
  day: ['#8fc3ee', '#e6f1f6'],
  golden: ['#f2a96b', '#f8dcae'],
  dusk: ['#3d3f73', '#e88a6a'],
  night: ['#0d1430', '#2b2f5a'],
};

/** Pencere: odanın saatine göre gökyüzü, uzakta şehir, keten perdeler ve pervazda küçük bir saksı. */
export function RoomWindow({ sky }: { sky: Lighting['sky'] }) {
  const id = useUid('win');
  const [top, bottom] = SKIES[sky];
  const dark = sky === 'night' || sky === 'dusk';

  return (
    <Focusable id="window">
      <AspectBox ratio={100 / 120}>
        <Svg width="100%" height="100%" viewBox="0 0 100 120">
          <Defs>
            <LinearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={top} />
              <Stop offset="1" stopColor={bottom} />
            </LinearGradient>
            <LinearGradient id={`${id}-linen`} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#e9dcc7" />
              <Stop offset="0.5" stopColor="#f8f0e3" />
              <Stop offset="1" stopColor="#ddcdb4" />
            </LinearGradient>
            <LinearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#ffffff" stopOpacity={0.18} />
              <Stop offset="0.5" stopColor="#ffffff" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {/* Duvardaki girinti gölgesi */}
          <Rect x="9" y="5" width="83" height="104" fill="rgba(60,35,20,0.18)" />
          {/* Cam ve gökyüzü */}
          <Rect x="14" y="10" width="72" height="92" fill={`url(#${id}-sky)`} />
          {sky === 'night' || sky === 'dusk' ? (
            <G>
              <Circle cx="66" cy="28" r="8" fill="#fff4d6" />
              <Circle cx="70" cy="25" r="7" fill={top} />
              {[[24, 20], [36, 32], [48, 18], [30, 46], [56, 40], [76, 46], [44, 54]].map(([x, y]) => (
                <Circle key={`${x}-${y}`} cx={x} cy={y} r="0.9" fill="#fff" opacity={sky === 'night' ? 0.85 : 0.4} />
              ))}
            </G>
          ) : (
            <G>
              <Circle cx="64" cy={sky === 'golden' ? 52 : sky === 'dawn' ? 56 : 30} r="9" fill={sky === 'day' ? '#fff3c4' : '#ffd38a'} />
              <Path d="M22 44 q4 -6 10 -3 q4 -5 10 0 q5 0 5 4 H22 Z" fill="#fff" opacity={0.85} />
              <Path d="M56 26 q3 -4 7 -2 q3 -3 7 0 q4 0 4 3 H56 Z" fill="#fff" opacity={0.7} />
            </G>
          )}
          {/* Uzak şehir silueti; akşam/gece pencereleri yanar */}
          {[
            [14, 76, 10, 26], [24, 68, 8, 34], [32, 80, 12, 22], [44, 64, 9, 38], [53, 74, 11, 28], [64, 70, 8, 32], [72, 78, 14, 24],
          ].map(([x, y, w, h], i) => (
            <G key={i}>
              <Rect x={x} y={y} width={w} height={h} fill={dark ? '#1f1a2e' : '#8a94b4'} opacity={dark ? 1 : 0.7} />
              {dark &&
                [0, 1, 2].map((r) => (
                  <Rect key={r} x={x + 2 + ((r + i) % 2) * 3} y={y + 4 + r * 6} width="1.6" height="2" fill="#ffd27a" opacity={0.85} />
                ))}
            </G>
          ))}
          <Rect x="14" y="10" width="72" height="92" fill={`url(#${id}-glass)`} />
          {/* Kasa ve kayıtlar */}
          <G fill="#f7efe3">
            <Rect x="10" y="6" width="80" height="4" />
            <Rect x="10" y="102" width="80" height="4" />
            <Rect x="10" y="6" width="4" height="100" />
            <Rect x="86" y="6" width="4" height="100" />
            <Rect x="48.5" y="10" width="3" height="92" />
            <Rect x="14" y="54" width="72" height="3" />
          </G>
          {/* Pervaz ve saksı */}
          <Rect x="6" y="104" width="88" height="6" rx="1.5" fill="#efe3d2" />
          <Rect x="6" y="109" width="88" height="2" fill="rgba(60,35,20,0.25)" />
          <Path d="M64 104 L66 96 L74 96 L76 104 Z" fill="#c46f50" />
          <Path d="M70 96 Q64 86 60 90 M70 96 Q74 84 79 88 M70 96 Q70 84 69 86" stroke="#5f8a5a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          {/* Keten perdeler, katlanma gölgeleri ve korniş */}
          <Path d="M1 2 H24 Q19 40 28 66 Q21 92 25 118 H1 Z" fill={`url(#${id}-linen)`} />
          <Path d="M99 2 H76 Q81 40 72 66 Q79 92 75 118 H99 Z" fill={`url(#${id}-linen)`} />
          {[8, 15].map((x) => (
            <Path key={x} d={`M${x} 4 Q${x - 2} 60 ${x + 1} 116`} stroke="rgba(150,120,85,0.25)" strokeWidth="1.2" fill="none" />
          ))}
          {[85, 92].map((x) => (
            <Path key={x} d={`M${x} 4 Q${x + 2} 60 ${x - 1} 116`} stroke="rgba(150,120,85,0.25)" strokeWidth="1.2" fill="none" />
          ))}
          <Rect x="0" y="0" width="100" height="3" rx="1.5" fill="#3a2e28" />
          <Rect x="16" y="64" width="11" height="3" rx="1.5" fill="#b98a62" />
          <Rect x="73" y="64" width="11" height="3" rx="1.5" fill="#b98a62" />
        </Svg>
      </AspectBox>
    </Focusable>
  );
}
