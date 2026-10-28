// 3. faz objeleri: günlük (TV ünitesindeki kitaplar), albüm (kitaplık), çiçek, oyun konsolu.
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { flowerStage, flowerWilted, type FlowerKind } from '@loveroom/shared';
import { useRoom } from '../../state/room';
import { useNow } from '../../hooks/useNow';
import { fonts } from '../../theme';
import { Bookshelf, GameConsole } from '../decor/Furniture';
import { useUid } from '../decor/useUid';
import { Focusable } from './Focusable';

/** TV ünitesinin üstündeki kitaplar ve kurdeleli ortak günlük. MediaConsole içindeki yuvaya yerleşir. */
export function DiaryBooks() {
  return (
    <Focusable id="diary">
      <Svg width="100%" height="100%" viewBox="0 0 44 22">
        <Rect x="2" y="15" width="36" height="6" rx="1" fill="#8b3f2c" />
        <Rect x="4" y="10" width="32" height="5" rx="1" fill="#e8d8c2" />
        {/* Günlük: deri kapak, altın kalp, kurdele */}
        <Rect x="6" y="2" width="30" height="8" rx="1.5" fill="#6f8a6a" />
        <Rect x="6" y="2" width="30" height="1.4" fill="rgba(255,255,255,0.25)" />
        <Path d="M21 7.6 C19.2 6.3 18.4 5.6 18.4 4.8 C18.4 4.2 18.9 3.7 19.5 3.7 C20.1 3.7 20.6 4 21 4.5 C21.4 4 21.9 3.7 22.5 3.7 C23.1 3.7 23.6 4.2 23.6 4.8 C23.6 5.6 22.8 6.3 21 7.6 Z" fill="#f2b85e" />
        <Path d="M31 10 L31 16 L33 14.5 L35 16 L35 10" fill="#c8664a" />
      </Svg>
    </Focusable>
  );
}

/** Kitaplık; içinde kalpli fotoğraf albümü. Dokununca albüm açılır. */
export function AlbumShelf() {
  return (
    <Focusable id="album">
      <Bookshelf />
      <View style={styles.albumBadge} pointerEvents="none">
        <Text style={styles.albumText}>📷</Text>
      </View>
    </Focusable>
  );
}

/** TV önündeki oyun konsolu. Bir oyun açıksa yeşil ışığı yanıp söner. */
export function ConsoleObject() {
  const playing = useRoom((r) => !!r.game);
  return (
    <Focusable id="console">
      <GameConsole />
      {playing && <View style={styles.liveDot} pointerEvents="none" />}
    </Focusable>
  );
}

const PETAL: Record<FlowerKind, [string, string]> = {
  tulip: ['#e8566a', '#b8344a'],
  rose: ['#d64561', '#9e2440'],
  sunflower: ['#f6c54a', '#d99a1c'],
  daisy: ['#ffffff', '#e8e2d6'],
};

/** Birlikte büyütülen çiçek: aşamaya göre tohumdan tam açmış çiçeğe; uzun süre sulanmazsa boynunu büker. */
export function FlowerPot() {
  const flower = useRoom((r) => r.flower);
  const now = useNow(true, 60_000);
  const stage = flowerStage(flower.growth);
  const wilted = flowerWilted(flower, now);
  const id = useUid('flower');
  const [petal, petalDark] = PETAL[flower.kind];
  const height = [0, 14, 28, 44, 58, 66][stage];
  const top = 92 - height;
  const lean = wilted ? 18 : 0;

  return (
    <Focusable id="flower">
      <Svg width="100%" height="100%" viewBox="0 0 60 130" preserveAspectRatio="xMidYMax meet">
        <Defs>
          <LinearGradient id={`${id}-pot`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#d9805c" />
            <Stop offset="1" stopColor="#a8563a" />
          </LinearGradient>
          <LinearGradient id={`${id}-leaf`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#8ab878" />
            <Stop offset="1" stopColor="#4a7a46" />
          </LinearGradient>
        </Defs>
        <Ellipse cx="30" cy="127" rx="20" ry="3" fill="rgba(26,13,5,0.35)" />
        {stage > 0 && (
          <G transform={`rotate(${lean} 30 92)`}>
            <Path d={`M30 92 Q${28 - lean / 4} ${92 - height / 2} 30 ${top}`} stroke="#4f7d48" strokeWidth="2.4" fill="none" />
            {stage >= 2 && <Ellipse cx="23" cy={92 - height * 0.35} rx="7" ry="3.2" fill={`url(#${id}-leaf)`} transform={`rotate(-30 23 ${92 - height * 0.35})`} />}
            {stage >= 2 && <Ellipse cx="37" cy={92 - height * 0.5} rx="7" ry="3.2" fill={`url(#${id}-leaf)`} transform={`rotate(30 37 ${92 - height * 0.5})`} />}
            {stage === 1 && <Ellipse cx="32" cy={top + 2} rx="4" ry="2" fill={`url(#${id}-leaf)`} />}
            {stage === 3 && <Ellipse cx="30" cy={top} rx="4" ry="6" fill={petalDark} />}
            {stage >= 4 && <Bloom kind={flower.kind} cx={30} cy={top} r={stage === 5 ? 11 : 8} petal={petal} dark={petalDark} />}
          </G>
        )}
        {/* Saksı */}
        <Path d="M14 92 H46 L42 126 H18 Z" fill={`url(#${id}-pot)`} />
        <Rect x="12" y="88" width="36" height="6" rx="2" fill="#e09068" />
        <Ellipse cx="30" cy="90" rx="15" ry="2" fill="#5a3a24" />
        {/* Tohum: toprağın üstünde küçük bir çıkıntı ve tabela */}
        {stage === 0 && (
          <G>
            <Ellipse cx="30" cy="88.5" rx="4" ry="2.4" fill="#7a5a3a" />
            <Path d="M40 89 L40 74" stroke="#a87249" strokeWidth="1.4" />
            <Rect x="35" y="70" width="12" height="7" rx="1" fill="#f4ecdf" />
            <Path d="M41 75.5 Q39 72.5 41 71.5 Q43 72.5 41 75.5 Z" fill="#6f9a5f" />
          </G>
        )}
      </Svg>
      {stage === 5 && !wilted && (
        <View style={styles.sparkle} pointerEvents="none">
          <Text style={{ fontSize: 10 }}>✨</Text>
        </View>
      )}
    </Focusable>
  );
}

function Bloom({ kind, cx, cy, r, petal, dark }: { kind: FlowerKind; cx: number; cy: number; r: number; petal: string; dark: string }) {
  if (kind === 'tulip') {
    return (
      <G>
        <Path d={`M${cx - r * 0.8} ${cy} Q${cx - r} ${cy - r * 1.3} ${cx - r * 0.3} ${cy - r * 1.1} L${cx} ${cy - r * 0.5} L${cx + r * 0.3} ${cy - r * 1.1} Q${cx + r} ${cy - r * 1.3} ${cx + r * 0.8} ${cy} Q${cx} ${cy + r * 0.7} ${cx - r * 0.8} ${cy} Z`} fill={petal} />
        <Path d={`M${cx} ${cy - r * 0.5} Q${cx - r * 0.3} ${cy} ${cx} ${cy + r * 0.4}`} stroke={dark} strokeWidth="1" fill="none" />
      </G>
    );
  }
  if (kind === 'rose') {
    return (
      <G>
        <Circle cx={cx} cy={cy} r={r} fill={dark} />
        <Circle cx={cx - 1} cy={cy - 1} r={r * 0.75} fill={petal} />
        <Path d={`M${cx - r * 0.4} ${cy} Q${cx} ${cy - r * 0.6} ${cx + r * 0.4} ${cy} Q${cx} ${cy + r * 0.3} ${cx - r * 0.2} ${cy - r * 0.1}`} stroke={dark} strokeWidth="1.2" fill="none" />
      </G>
    );
  }
  const center = kind === 'sunflower' ? '#6b3f1f' : '#f2b85e';
  return (
    <G>
      {Array.from({ length: kind === 'sunflower' ? 12 : 10 }, (_, i) => {
        const a = (i / (kind === 'sunflower' ? 12 : 10)) * 360;
        return <Ellipse key={i} cx={cx} cy={cy - r * 0.62} rx={r * 0.26} ry={r * 0.5} fill={i % 2 ? petal : dark} transform={`rotate(${a} ${cx} ${cy})`} />;
      })}
      <Circle cx={cx} cy={cy} r={r * 0.36} fill={center} />
    </G>
  );
}

const styles = StyleSheet.create({
  albumBadge: {
    position: 'absolute',
    top: '30%',
    right: '8%',
    backgroundColor: 'rgba(251,243,230,0.9)',
    borderRadius: 8,
    paddingHorizontal: 3,
    paddingVertical: 1,
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
  },
  albumText: { fontSize: 10, fontFamily: fonts.bodyBold },
  liveDot: {
    position: 'absolute',
    left: '40%',
    top: '55%',
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#7ed49a',
    boxShadow: '0 0 6px 2px rgba(126,212,154,0.8)',
  },
  sparkle: { position: 'absolute', top: '6%', right: '20%' },
});
