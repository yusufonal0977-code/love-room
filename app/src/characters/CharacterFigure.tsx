import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import {
  DEFAULT_CHARACTER,
  HAIR_COLORS,
  OUTFIT_COLORS,
  SKIN_TONES,
  type Character,
} from '@loveroom/shared';
import { useUid } from '../room/decor/useUid';

interface Props {
  character: Character | null;
  /** 'seated': kanepede oturan tam boy; 'bust': avatar için baş ve omuzlar. */
  mode?: 'seated' | 'bust';
}

/** Kişiye özel karakter çizimi. Aynı çizim kanepede ve avatarlarda kullanılır. */
export function CharacterFigure({ character, mode = 'seated' }: Props) {
  const c = character ?? DEFAULT_CHARACTER;
  const id = useUid('char');
  const skin = SKIN_TONES[c.skin];
  const hair = HAIR_COLORS[c.hairColor];
  const outfit = OUTFIT_COLORS[c.outfit];
  const viewBox = mode === 'bust' ? '16 8 68 68' : '0 0 100 140';

  return (
    <Svg width="100%" height="100%" viewBox={viewBox}>
      <Defs>
        <LinearGradient id={`${id}-cloth`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={outfit} />
          <Stop offset="1" stopColor={outfit} stopOpacity={0.78} />
        </LinearGradient>
        <LinearGradient id={`${id}-skin`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={skin} />
          <Stop offset="1" stopColor={skin} stopOpacity={0.9} />
        </LinearGradient>
      </Defs>

      {/* Arka saç (uzun/kısa küt) */}
      {c.hair === 'long' && <Path d="M30 34 Q28 62 34 84 L66 84 Q72 62 70 34 Z" fill={hair} />}
      {c.hair === 'bob' && <Path d="M30 34 Q28 52 32 60 L68 60 Q72 52 70 34 Z" fill={hair} />}

      {/* Bacaklar (oturur), ayakkabılar */}
      <Rect x="32" y="98" width="17" height="28" rx="7" fill="#3f4a5e" />
      <Rect x="51" y="98" width="17" height="28" rx="7" fill="#36405a" />
      <Ellipse cx="40" cy="128" rx="9" ry="4.5" fill="#2b2420" />
      <Ellipse cx="60" cy="128" rx="9" ry="4.5" fill="#2b2420" />

      {/* Gövde ve kollar */}
      <Path d="M27 74 Q28 62 50 61 Q72 62 73 74 L75 104 Q50 111 25 104 Z" fill={`url(#${id}-cloth)`} />
      <Path d="M29 72 Q22 88 34 101" stroke={outfit} strokeWidth="8" fill="none" strokeLinecap="round" />
      <Path d="M71 72 Q78 88 66 101" stroke={outfit} strokeWidth="8" fill="none" strokeLinecap="round" />
      <Circle cx="36" cy="101" r="4.2" fill={skin} />
      <Circle cx="64" cy="101" r="4.2" fill={skin} />
      <Path d="M44 63 Q50 68 56 63" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" fill="none" />

      {/* Boyun ve baş */}
      <Rect x="45" y="50" width="10" height="13" rx="4" fill={skin} />
      <Circle cx="32" cy="40" r="3.4" fill={skin} />
      <Circle cx="68" cy="40" r="3.4" fill={skin} />
      <Ellipse cx="50" cy="38" rx="18" ry="19" fill={`url(#${id}-skin)`} />

      {/* Yüz */}
      <Ellipse cx="43" cy="40" rx="2" ry="2.6" fill="#2b1d16" />
      <Ellipse cx="57" cy="40" rx="2" ry="2.6" fill="#2b1d16" />
      <Circle cx="43.7" cy="39" r="0.7" fill="#fff" />
      <Circle cx="57.7" cy="39" r="0.7" fill="#fff" />
      <Circle cx="39" cy="46" r="3" fill="#e8907a" opacity={0.35} />
      <Circle cx="61" cy="46" r="3" fill="#e8907a" opacity={0.35} />
      <Path d="M46 47 Q50 50.5 54 47" stroke="#7a3f30" strokeWidth="1.3" fill="none" strokeLinecap="round" />

      {/* Ön saç */}
      <HairFront style={c.hair} color={hair} />

      {/* Aksesuar */}
      {c.accessory === 'glasses' && (
        <G stroke="#2b2420" strokeWidth="1.2" fill="rgba(255,255,255,0.15)">
          <Circle cx="43" cy="40" r="5" />
          <Circle cx="57" cy="40" r="5" />
          <Path d="M48 40 L52 40" />
        </G>
      )}
      {c.accessory === 'beanie' && (
        <G>
          <Path d="M30 30 Q30 12 50 12 Q70 12 70 30 Z" fill="#c8664a" />
          <Rect x="29" y="27" width="42" height="7" rx="3" fill="#a9503a" />
          <Circle cx="50" cy="11" r="4" fill="#efe2cb" />
        </G>
      )}
      {c.accessory === 'flower' && (
        <G>
          {[0, 72, 144, 216, 288].map((a) => (
            <Ellipse key={a} cx="66" cy="23" rx="2.4" ry="4" fill="#f3c9b0" transform={`rotate(${a} 66 27)`} />
          ))}
          <Circle cx="66" cy="27" r="2" fill="#e0a940" />
        </G>
      )}
      {c.accessory === 'headphones' && (
        <G>
          <Path d="M31 38 Q31 14 50 14 Q69 14 69 38" stroke="#2e2a2a" strokeWidth="3" fill="none" />
          <Rect x="27" y="34" width="7" height="12" rx="3" fill="#2e2a2a" />
          <Rect x="66" y="34" width="7" height="12" rx="3" fill="#2e2a2a" />
        </G>
      )}
    </Svg>
  );
}

function HairFront({ style, color }: { style: Character['hair']; color: string }) {
  switch (style) {
    case 'short':
      return <Path d="M31 36 Q30 17 50 17 Q70 17 69 36 Q63 25 52 27 Q40 23 31 36 Z" fill={color} />;
    case 'long':
      return (
        <Path d="M31 44 Q28 17 50 17 Q72 17 69 44 Q66 30 58 26 Q54 32 44 30 Q36 30 31 44 Z" fill={color} />
      );
    case 'bun':
      return (
        <G fill={color}>
          <Circle cx="50" cy="15" r="7.5" />
          <Path d="M31 36 Q31 19 50 19 Q69 19 69 36 Q62 27 50 27 Q38 27 31 36 Z" />
        </G>
      );
    case 'curly':
      return (
        <G fill={color}>
          {[
            [33, 32], [36, 24], [43, 19], [50, 17], [57, 19], [64, 24], [67, 32], [40, 25], [60, 25],
          ].map(([x, y], i) => (
            <Circle key={i} cx={x} cy={y} r="6" />
          ))}
        </G>
      );
    case 'bob':
      return <Path d="M31 42 Q29 18 50 18 Q71 18 69 42 L66 33 Q58 29 50 31 Q42 29 34 33 Z" fill={color} />;
  }
}
