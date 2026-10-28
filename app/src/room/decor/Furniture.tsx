// Dekoratif (etkileşimsiz) mobilya ve eşyalar. Hepsi gradyan, gölge ve temas gölgesiyle çizilir;
// düz renkli "sticker" görünümünden kaçınmak için ışık hep sol üstten gelir.
import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Line, Path, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';
import { AspectBox } from '../objects/AspectBox';
import { useUid } from './useUid';

const BOTTOM = 'xMidYMax meet';

/** Eşyanın zemine değdiği yerdeki yumuşak gölge. */
function ContactShadow({ id, cx, cy, rx, ry, opacity = 0.45 }: { id: string; cx: number; cy: number; rx: number; ry: number; opacity?: number }) {
  return (
    <>
      <Defs>
        <RadialGradient id={`${id}-cs`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#1a0d05" stopOpacity={opacity} />
          <Stop offset="1" stopColor="#1a0d05" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${id}-cs)`} />
    </>
  );
}

function WoodDefs({ id, light = '#a87249', dark = '#6e4426' }: { id: string; light?: string; dark?: string }) {
  return (
    <Defs>
      <LinearGradient id={`${id}-wood`} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor={light} />
        <Stop offset="1" stopColor={dark} />
      </LinearGradient>
      <LinearGradient id={`${id}-top`} x1="0" y1="0" x2="1" y2="0">
        <Stop offset="0" stopColor="#c99466" />
        <Stop offset="1" stopColor="#a8734a" />
      </LinearGradient>
    </Defs>
  );
}

/**
 * Orta yüzyıl tarzı alçak TV ünitesi; üstünde mumlar ve küçük bitki.
 * `bookSlot`: ünitenin üstündeki kitap/günlük yuvası (etkileşimli obje buraya yerleşir).
 */
export function MediaConsole({ bookSlot }: { bookSlot?: ReactNode }) {
  const id = useUid('console');
  return (
    <AspectBox ratio={220 / 60} align="flex-end">
      <Svg width="100%" height="100%" viewBox="0 0 220 60">
      <WoodDefs id={id} />
      <ContactShadow id={id} cx={110} cy={57} rx={104} ry={4} />
      {/* Üstündekiler */}
      <G>
        <Rect x="20" y="4" width="5" height="12" rx="1" fill="#fbf1e2" />
        <Rect x="27" y="0" width="5" height="16" rx="1" fill="#f6e8d3" />
        <Rect x="34" y="7" width="5" height="9" rx="1" fill="#fbf1e2" />
        <Path d="M196 16 L198 6 L208 6 L210 16 Z" fill="#c46f50" />
        <Path d="M203 6 Q196 -6 190 -1 M203 6 Q206 -8 213 -3 M203 6 Q203 -10 202 -6" stroke="#5f8a5a" strokeWidth="3" fill="none" strokeLinecap="round" />
      </G>
      {/* Gövde */}
      <Rect x="6" y="16" width="208" height="5" rx="2" fill={`url(#${id}-top)`} />
      <Rect x="8" y="21" width="204" height="27" rx="2" fill={`url(#${id}-wood)`} />
      {[0, 1, 2].map((i) => (
        <G key={i}>
          <Rect x={14 + i * 66} y={25} width={60} height={19} rx={1.5} fill="rgba(0,0,0,0.1)" />
          {Array.from({ length: 10 }, (_, k) => (
            <Line key={k} x1={18 + i * 66 + k * 5.6} y1={26} x2={18 + i * 66 + k * 5.6} y2={43} stroke="rgba(255,225,190,0.16)" strokeWidth="1.2" />
          ))}
        </G>
      ))}
      <Rect x="8" y="21" width="204" height="1.2" fill="rgba(0,0,0,0.25)" />
      <Path d="M22 48 L18 58 M198 48 L202 58 M70 48 L68 56 M150 48 L152 56" stroke="#4a2e1a" strokeWidth="3" strokeLinecap="round" />
      </Svg>
      {/* Kitap yuvası: viewBox'ta x 146–190, y -6–16 (ünitenin üst yüzeyine oturur) */}
      {bookSlot && (
        <View style={{ position: 'absolute', left: `${(146 / 220) * 100}%`, top: '-10%', width: '20%', height: '36.7%' }}>
          {bookSlot}
        </View>
      )}
    </AspectBox>
  );
}

/** Perspektifli kilim: arka kenar dar, ön kenar geniş — zemine yatmış gibi görünür. */
export function Rug() {
  const id = useUid('rug');
  return (
    <Svg width="100%" height="100%" viewBox="0 0 200 60" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#c56a4c" />
          <Stop offset="1" stopColor="#a5503a" />
        </LinearGradient>
      </Defs>
      <Polygon points="30,2 170,2 196,56 4,56" fill="rgba(30,15,5,0.25)" transform="translate(0,2)" />
      <Polygon points="30,2 170,2 196,56 4,56" fill={`url(#${id}-g)`} />
      <Polygon points="38,7 162,7 184,51 16,51" fill="none" stroke="#f1dcc0" strokeWidth="2" />
      <Polygon points="50,14 150,14 166,44 34,44" fill="#e9d2b2" />
      <Polygon points="58,18 142,18 154,40 46,40" fill="#3f5a6e" />
      {[0, 1, 2, 3, 4].map((i) => {
        const cx = 76 + i * 12;
        return <Polygon key={i} points={`${cx},22 ${cx + 5},29 ${cx},36 ${cx - 5},29`} fill="#e3a752" />;
      })}
      {Array.from({ length: 30 }, (_, i) => (
        <Line key={i} x1={6 + i * 6.4} y1={56} x2={5 + i * 6.4} y2={60} stroke="#f1dcc0" strokeWidth="1" />
      ))}
    </Svg>
  );
}

/** Yuvarlak hasır halı (arka duvar). */
export function JuteRug() {
  const id = useUid('jute');
  return (
    <Svg width="100%" height="100%" viewBox="0 0 200 50" preserveAspectRatio="none">
      <Defs>
        <RadialGradient id={`${id}-g`} cx="50%" cy="45%" r="55%">
          <Stop offset="0" stopColor="#dcc39a" />
          <Stop offset="1" stopColor="#b99a6e" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="100" cy="27" rx="98" ry="22" fill="rgba(30,15,5,0.22)" />
      <Ellipse cx="100" cy="25" rx="97" ry="22" fill={`url(#${id}-g)`} />
      {[0.82, 0.64, 0.46, 0.28].map((k) => (
        <Ellipse key={k} cx="100" cy="25" rx={97 * k} ry={22 * k} fill="none" stroke="rgba(120,85,45,0.35)" strokeWidth="0.8" />
      ))}
    </Svg>
  );
}

/** Şömine önünde koyun postu. */
export function Sheepskin() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 120 40" preserveAspectRatio="none">
      <Path d="M12 22 Q4 10 20 8 Q30 0 46 5 Q60 -1 74 5 Q90 0 100 8 Q116 10 108 22 Q118 32 102 35 Q88 42 74 36 Q60 42 46 36 Q30 42 18 35 Q2 32 12 22 Z" fill="rgba(30,15,5,0.25)" transform="translate(0,3)" />
      <Path d="M12 22 Q4 10 20 8 Q30 0 46 5 Q60 -1 74 5 Q90 0 100 8 Q116 10 108 22 Q118 32 102 35 Q88 42 74 36 Q60 42 46 36 Q30 42 18 35 Q2 32 12 22 Z" fill="#f4ede2" />
      <Path d="M24 20 Q40 14 60 18 Q80 14 96 20" stroke="#e2d6c4" strokeWidth="2" fill="none" />
      <Path d="M28 27 Q46 23 62 26 Q80 23 92 27" stroke="#e2d6c4" strokeWidth="2" fill="none" />
    </Svg>
  );
}

/** Kavisli lambader; `lit` iken abajur içten parlar. */
export function FloorLamp({ lit }: { lit: number }) {
  const id = useUid('lamp');
  return (
    <Svg width="100%" height="100%" viewBox="0 0 60 180" preserveAspectRatio={BOTTOM}>
      <Defs>
        <LinearGradient id={`${id}-shade`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#efe2cc" />
          <Stop offset="1" stopColor="#d4c1a2" />
        </LinearGradient>
        <RadialGradient id={`${id}-bulb`} cx="50%" cy="100%" r="80%">
          <Stop offset="0" stopColor="#fff4cf" stopOpacity={lit} />
          <Stop offset="1" stopColor="#ffd98a" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <ContactShadow id={id} cx={30} cy={176} rx={20} ry={3} />
      <Path d="M30 172 L30 40 Q30 24 18 24" stroke="#2e2420" strokeWidth="2.5" fill="none" />
      <Ellipse cx="30" cy="174" rx="13" ry="3.5" fill="#2e2420" />
      <Path d="M4 22 L32 22 L28 6 L8 6 Z" fill={`url(#${id}-shade)`} />
      <Ellipse cx="18" cy="22" rx="14" ry="2.6" fill={lit > 0.3 ? '#fff0c4' : '#cdbb9c'} />
      <Ellipse cx="18" cy="30" rx="16" ry="10" fill={`url(#${id}-bulb)`} />
    </Svg>
  );
}

/** Saksı bitkisi; `tall` keman yapraklı incir, değilse dolgun yapraklı küçük bitki. */
export function Plant({ tall }: { tall?: boolean }) {
  const id = useUid('plant');
  const leaves = tall
    ? [
        [30, 18, -20], [20, 32, -40], [40, 30, 30], [26, 46, -30], [38, 50, 35], [30, 62, -10], [22, 70, -45], [40, 74, 40],
      ]
    : [
        [30, 30, -10], [18, 38, -50], [42, 38, 45], [24, 50, -30], [36, 52, 30],
      ];
  return (
    <Svg width="100%" height="100%" viewBox={tall ? '0 0 60 140' : '0 0 60 100'} preserveAspectRatio={BOTTOM}>
      <Defs>
        <LinearGradient id={`${id}-leaf`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#7fa86e" />
          <Stop offset="1" stopColor="#3f6b45" />
        </LinearGradient>
        <LinearGradient id={`${id}-pot`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#efe6d8" />
          <Stop offset="1" stopColor="#c9bba6" />
        </LinearGradient>
      </Defs>
      <ContactShadow id={id} cx={30} cy={tall ? 137 : 97} rx={20} ry={3} />
      {tall && <Path d="M30 104 Q28 70 31 20" stroke="#5a4130" strokeWidth="2" fill="none" />}
      {leaves.map(([x, y, r], i) => (
        <G key={i} transform={`rotate(${r} ${x} ${y})`}>
          <Ellipse cx={x} cy={y} rx={tall ? 9 : 8} ry={tall ? 13 : 12} fill={`url(#${id}-leaf)`} />
          <Path d={`M${x} ${y - 11} L${x} ${y + 11}`} stroke="rgba(230,245,210,0.35)" strokeWidth="0.8" />
        </G>
      ))}
      <Path d={tall ? 'M14 104 H46 L42 138 H18 Z' : 'M14 64 H46 L42 98 H18 Z'} fill={`url(#${id}-pot)`} />
      <Rect x="12" y={tall ? 101 : 61} width="36" height="5" rx="2" fill="#e8dccb" />
    </Svg>
  );
}

/** Pencere altındaki alçak dolap (pikap ve kavanoz üstünde durur). */
export function LowCabinet() {
  const id = useUid('cab');
  return (
    <Svg width="100%" height="100%" viewBox="0 0 200 56" preserveAspectRatio="none">
      <WoodDefs id={id} light="#b07a4f" dark="#7a4d2e" />
      <ContactShadow id={id} cx={100} cy={53} rx={96} ry={4} />
      <Rect x="0" y="0" width="200" height="6" rx="2" fill={`url(#${id}-top)`} />
      <Rect x="4" y="6" width="192" height="38" fill={`url(#${id}-wood)`} />
      <Rect x="4" y="6" width="192" height="1.2" fill="rgba(0,0,0,0.25)" />
      <Rect x="12" y="11" width="84" height="28" rx="2" fill="rgba(0,0,0,0.08)" stroke="rgba(255,230,200,0.22)" />
      <Rect x="104" y="11" width="84" height="28" rx="2" fill="rgba(0,0,0,0.08)" stroke="rgba(255,230,200,0.22)" />
      <Circle cx="91" cy="25" r="1.8" fill="#d9b06a" />
      <Circle cx="109" cy="25" r="1.8" fill="#d9b06a" />
      <Path d="M14 44 L11 54 M186 44 L189 54" stroke="#4a2e1a" strokeWidth="3" strokeLinecap="round" />
    </Svg>
  );
}

/** Kanepe önündeki yuvarlak sehpa: mumlar, patlamış mısır, iki kupa. */
export function CoffeeTable() {
  const id = useUid('coffee');
  return (
    <Svg width="100%" height="100%" viewBox="0 0 160 50" preserveAspectRatio={BOTTOM}>
      <WoodDefs id={id} light="#b9824f" dark="#8a5a34" />
      <ContactShadow id={id} cx={80} cy={46} rx={70} ry={5} opacity={0.5} />
      <Path d="M36 24 L30 46 M124 24 L130 46 M60 26 L58 44 M100 26 L102 44" stroke="#5a3a22" strokeWidth="3.5" strokeLinecap="round" />
      <Ellipse cx="80" cy="25" rx="64" ry="9" fill="#6e4426" />
      <Ellipse cx="80" cy="22" rx="64" ry="9" fill={`url(#${id}-top)`} />
      <Ellipse cx="80" cy="21" rx="58" ry="7" fill="rgba(255,240,215,0.12)" />
      {/* Mısır kâsesi */}
      <Path d="M62 18 Q62 26 72 26 Q82 26 82 18 Z" fill="#c85a46" />
      {[64, 68, 72, 76, 80, 66, 74].map((x, i) => (
        <Circle key={i} cx={x} cy={i > 4 ? 13 : 16} r="2.6" fill="#fff6e0" />
      ))}
      {/* Kupalar */}
      <Rect x="96" y="11" width="9" height="10" rx="2" fill="#f1e6d6" />
      <Path d="M105 13 Q109 15 105 18" stroke="#f1e6d6" strokeWidth="1.6" fill="none" />
      <Rect x="110" y="12" width="9" height="9" rx="2" fill="#7f9a78" />
      {/* Mumlar */}
      <Rect x="40" y="12" width="6" height="9" rx="1" fill="#fbf1e2" />
      <Rect x="48" y="15" width="6" height="6" rx="1" fill="#fbf1e2" />
    </Svg>
  );
}

/** Şömine yanında kulaklı berjer (adaçayı kadife) ve üstünde örgü battaniye. */
export function Armchair() {
  const id = useUid('chair');
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio={BOTTOM}>
      <Defs>
        <LinearGradient id={`${id}-v`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#9db38f" />
          <Stop offset="1" stopColor="#5f7a58" />
        </LinearGradient>
      </Defs>
      <ContactShadow id={id} cx={50} cy={96} rx={44} ry={4} />
      <Path d="M18 90 L16 98 M82 90 L84 98" stroke="#4a2e1a" strokeWidth="3" strokeLinecap="round" />
      <Path d="M20 20 Q20 6 50 6 Q80 6 80 20 L80 62 L20 62 Z" fill={`url(#${id}-v)`} />
      <Path d="M30 22 Q50 14 70 22" stroke="rgba(255,255,255,0.15)" strokeWidth="2" fill="none" />
      <Rect x="18" y="58" width="64" height="20" rx="8" fill="#86a07a" />
      <Rect x="8" y="40" width="18" height="50" rx="9" fill="#7d966f" />
      <Rect x="74" y="40" width="18" height="50" rx="9" fill="#6f8862" />
      <Rect x="20" y="74" width="60" height="16" rx="4" fill="#5f7a58" />
      <Path d="M58 30 Q76 26 84 36 L86 76 Q72 80 62 74 Z" fill="#f1e3cf" />
      {[0, 1, 2].map((i) => (
        <Path key={i} d={`M${62 + i * 7} ${30 - i} L${66 + i * 7} ${76 + i}`} stroke="#dfcbb0" strokeWidth="2" />
      ))}
    </Svg>
  );
}

/** Şömine yanında odun sepeti. */
export function LogBasket() {
  const id = useUid('logs');
  return (
    <Svg width="100%" height="100%" viewBox="0 0 60 50" preserveAspectRatio={BOTTOM}>
      <ContactShadow id={id} cx={30} cy={47} rx={26} ry={3} />
      {[12, 22, 32, 42].map((x, i) => (
        <G key={x}>
          <Rect x={x - 4} y={4 + (i % 2) * 3} width="9" height="22" rx="4" fill="#7a4e30" />
          <Ellipse cx={x + 0.5} cy={5 + (i % 2) * 3} rx="4.5" ry="2.5" fill="#d9b48a" />
        </G>
      ))}
      <Path d="M6 20 H54 L50 46 H10 Z" fill="#a9845a" />
      {[26, 32, 38].map((y) => (
        <Path key={y} d={`M8 ${y} H52`} stroke="rgba(70,45,20,0.35)" strokeWidth="1" />
      ))}
    </Svg>
  );
}

/** Örgü puf ve yer minderi. */
export function Pouf() {
  const id = useUid('pouf');
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 50" preserveAspectRatio={BOTTOM}>
      <ContactShadow id={id} cx={50} cy={47} rx={46} ry={4} />
      <Ellipse cx="34" cy="38" rx="28" ry="9" fill="#d8c5a5" />
      <Rect x="6" y="16" width="56" height="22" rx="10" fill="#e6d6ba" />
      <Ellipse cx="34" cy="16" rx="28" ry="8" fill="#efe2cb" />
      {Array.from({ length: 7 }, (_, i) => (
        <Path key={i} d={`M${12 + i * 8} 20 Q${14 + i * 8} 28 ${12 + i * 8} 36`} stroke="rgba(150,120,80,0.35)" strokeWidth="1.4" fill="none" />
      ))}
      <Rect x="58" y="28" width="38" height="16" rx="6" fill="#c8664a" />
      <Rect x="60" y="26" width="34" height="8" rx="4" fill="#d9785a" />
    </Svg>
  );
}

/** TV önündeki oyun konsolu ve kolu (ileride mini oyunlara açılacak). */
export function GameConsole() {
  const id = useUid('game');
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 40" preserveAspectRatio={BOTTOM}>
      <ContactShadow id={id} cx={50} cy={37} rx={46} ry={3} />
      <Rect x="8" y="14" width="44" height="20" rx="4" fill="#f4f0ea" />
      <Rect x="8" y="14" width="44" height="4" rx="2" fill="#ffffff" />
      <Circle cx="44" cy="26" r="2" fill="#7ed49a" />
      <Rect x="14" y="24" width="18" height="2" rx="1" fill="#c9c2b8" />
      <Path d="M52 26 Q62 34 70 26" stroke="#3a3330" strokeWidth="1" fill="none" />
      <Path d="M64 22 Q60 18 66 16 L86 16 Q92 18 88 22 L90 30 Q88 36 82 32 L72 32 Q66 36 64 30 Z" fill="#3a3330" />
      <Circle cx="70" cy="23" r="2" fill="#5a524d" />
      <Circle cx="82" cy="21" r="1.4" fill="#d9785a" />
      <Circle cx="85" cy="24" r="1.4" fill="#7f9a78" />
    </Svg>
  );
}

/** Kitaplık: renkli kitap sırtları, küçük bitki ve çerçeve. */
export function Bookshelf() {
  const id = useUid('shelf');
  const spines = ['#8b3f2c', '#e3c9a0', '#5b7fa6', '#7f9a78', '#c8664a', '#d9a95c', '#45414f', '#b5838d'];
  return (
    <Svg width="100%" height="100%" viewBox="0 0 80 150" preserveAspectRatio={BOTTOM}>
      <WoodDefs id={id} light="#b07a4f" dark="#7a4d2e" />
      <ContactShadow id={id} cx={40} cy={147} rx={38} ry={3} />
      <Rect x="4" y="4" width="72" height="140" rx="2" fill={`url(#${id}-wood)`} />
      <Rect x="9" y="8" width="62" height="132" fill="#4a2e1c" />
      {[0, 1, 2].map((row) => (
        <G key={row}>
          {Array.from({ length: 8 }, (_, i) => {
            const h = 26 + ((i * 7 + row * 3) % 9);
            return row === 1 && i > 4 ? null : (
              <Rect key={i} x={11 + i * 7.4} y={10 + row * 44 + (40 - h)} width="6.4" height={h} rx="0.8" fill={spines[(i + row * 3) % spines.length]} />
            );
          })}
          <Rect x="8" y={50 + row * 44} width="64" height="4" fill={`url(#${id}-top)`} />
        </G>
      ))}
      <Path d="M58 98 L60 88 L68 88 L70 98 Z" fill="#c46f50" />
      <Path d="M64 88 Q58 78 54 82 M64 88 Q68 76 72 80" stroke="#5f8a5a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </Svg>
  );
}

/** Küçük dekor çerçevesi (galeri duvarı). */
export function MiniFrame({ variant }: { variant: 0 | 1 }) {
  const id = useUid('mini');
  return (
    <Svg width="100%" height="100%" viewBox="0 0 60 70">
      <Defs>
        <LinearGradient id={`${id}-art`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={variant ? '#f2c9a8' : '#cfe0e3'} />
          <Stop offset="1" stopColor={variant ? '#e08a63' : '#8fb0a8'} />
        </LinearGradient>
      </Defs>
      <Rect x="3" y="5" width="56" height="64" fill="rgba(40,20,10,0.25)" />
      <Rect x="0" y="2" width="56" height="64" fill="#2e2420" />
      <Rect x="4" y="6" width="48" height="56" fill="#fbf6ee" />
      <Rect x="10" y="12" width="36" height="44" fill={`url(#${id}-art)`} />
      {variant ? (
        <Circle cx="28" cy="30" r="8" fill="#fbe3b8" />
      ) : (
        <Path d="M10 46 Q20 34 28 42 Q36 30 46 40 L46 56 L10 56 Z" fill="#5f7a58" />
      )}
    </Svg>
  );
}
