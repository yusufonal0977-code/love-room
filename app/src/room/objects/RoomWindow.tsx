import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { useNow } from '../../hooks/useNow';
import { colors } from '../../theme';
import { Focusable } from './Focusable';
import { AspectBox } from './AspectBox';

type Sky = 'night' | 'dusk' | 'day';
const SKIES: Record<Sky, [string, string]> = {
  night: ['#0b1030', '#3a2a5e'],
  dusk: ['#5b3a8a', '#ff9a8b'],
  day: ['#86b9f3', '#f4d6ee'],
};

const skyAt = (h: number): Sky => (h >= 20 || h < 6 ? 'night' : h >= 17 || h < 8 ? 'dusk' : 'day');

/** Pencere: senin şehrinin gökyüzü (saate göre), uzakta şehir ışıkları ve gül rengi perdeler. */
export function RoomWindow() {
  const now = useNow(true, 60_000);
  const sky = skyAt(new Date(now).getHours());
  const [top, bottom] = SKIES[sky];
  const night = sky !== 'day';

  return (
    <Focusable id="window">
      <AspectBox ratio={100 / 120}>
        <Svg width="100%" height="100%" viewBox="0 0 100 120">
          <Defs>
            <LinearGradient id="win-sky" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={top} />
              <Stop offset="1" stopColor={bottom} />
            </LinearGradient>
            <LinearGradient id="win-curtain" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#b8577a" />
              <Stop offset="0.5" stopColor="#d9799a" />
              <Stop offset="1" stopColor="#a34a6b" />
            </LinearGradient>
          </Defs>
          {/* Cam ve gökyüzü */}
          <Rect x="14" y="10" width="72" height="92" fill="url(#win-sky)" />
          {night ? (
            <G>
              <Circle cx="66" cy="28" r="8" fill="#fff4d6" />
              <Circle cx="70" cy="25" r="7" fill={top} />
              {[
                [24, 20], [36, 32], [48, 18], [30, 46], [56, 40], [76, 46], [44, 54],
              ].map(([x, y]) => (
                <Circle key={`${x}-${y}`} cx={x} cy={y} r="0.9" fill="#fff" opacity={0.85} />
              ))}
            </G>
          ) : (
            <G>
              <Circle cx="64" cy="30" r="9" fill="#ffe08a" />
              <Path d="M22 44 q4 -6 10 -3 q4 -5 10 0 q5 0 5 4 H22 Z" fill="#fff" opacity={0.9} />
            </G>
          )}
          {/* Uzak şehir silueti, gece pencereleri yanar */}
          <G>
            {[
              [14, 76, 10, 26], [24, 68, 8, 34], [32, 80, 12, 22], [44, 64, 9, 38], [53, 74, 11, 28], [64, 70, 8, 32], [72, 78, 14, 24],
            ].map(([x, y, w, h], i) => (
              <G key={i}>
                <Rect x={x} y={y} width={w} height={h} fill={night ? '#1c1430' : '#7e86b8'} />
                {night &&
                  [0, 1, 2].map((r) => (
                    <Rect key={r} x={x + 2 + ((r + i) % 2) * 3} y={y + 4 + r * 6} width="1.6" height="2" fill="#ffd27a" opacity={0.8} />
                  ))}
              </G>
            ))}
          </G>
          {/* Kasa ve kayıtlar */}
          <G fill="#f5e6da">
            <Rect x="10" y="6" width="80" height="4" />
            <Rect x="10" y="102" width="80" height="4" />
            <Rect x="10" y="6" width="4" height="100" />
            <Rect x="86" y="6" width="4" height="100" />
            <Rect x="48.5" y="10" width="3" height="92" />
            <Rect x="14" y="54" width="72" height="3" />
          </G>
          <Rect x="6" y="104" width="88" height="6" rx="1.5" fill="#e9d6c6" />
          {/* Perdeler ve bağcıklar */}
          <Path d="M2 0 H26 Q20 40 30 66 Q22 92 26 118 H2 Z" fill="url(#win-curtain)" />
          <Path d="M98 0 H74 Q80 40 70 66 Q78 92 74 118 H98 Z" fill="url(#win-curtain)" />
          <Rect x="0" y="0" width="100" height="4" rx="2" fill={colors.goldDeep} />
          <Rect x="17" y="63" width="10" height="3" rx="1.5" fill={colors.gold} />
          <Rect x="73" y="63" width="10" height="3" rx="1.5" fill={colors.gold} />
        </Svg>
      </AspectBox>
    </Focusable>
  );
}
