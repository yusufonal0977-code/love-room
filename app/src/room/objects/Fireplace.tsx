import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useRoom } from '../../state/room';
import { useUid } from '../decor/useUid';
import { Focusable } from './Focusable';
import { AspectBox } from './AspectBox';

const useNativeDriver = Platform.OS !== 'web';

/** Taş şömine: rafında mumlar, içinde titreyen alevler. Yakıp söndürmek iki ekranda senkron. */
export function Fireplace() {
  const lit = useRoom((r) => r.fireplaceLit);
  const id = useUid('fire');
  return (
    <Focusable id="fireplace">
      <AspectBox ratio={120 / 156} align="flex-end">
        <Svg width="100%" height="100%" viewBox="0 -16 120 156">
          <Defs>
            <RadialGradient id={`${id}-glow`} cx="50%" cy="80%" r="60%">
              <Stop offset="0" stopColor={lit ? '#ffb15c' : '#3a2a26'} stopOpacity={lit ? 0.95 : 1} />
              <Stop offset="1" stopColor="#1a0e0c" />
            </RadialGradient>
            <LinearGradient id={`${id}-brick`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#f3ebe0" />
              <Stop offset="1" stopColor="#d9cbb8" />
            </LinearGradient>
            <LinearGradient id={`${id}-beam`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#a87249" />
              <Stop offset="1" stopColor="#6e4426" />
            </LinearGradient>
          </Defs>
          {/* Gövde: boyalı tuğla */}
          <Rect x="9" y="22" width="108" height="122" fill="rgba(50,25,10,0.22)" />
          <Rect x="6" y="18" width="108" height="122" rx="2" fill={`url(#${id}-brick)`} />
          <G stroke="rgba(150,125,100,0.45)" strokeWidth="0.7">
            {[30, 42, 54, 66, 78, 90, 102, 114, 126].map((y, i) => (
              <Path
                key={y}
                d={`M6 ${y} H114 ${[0, 1, 2, 3, 4].map((k) => `M${(i % 2 ? 17 : 6) + k * 22} ${y - 12} V${y}`).join(' ')}`}
              />
            ))}
          </G>
          {/* Ocak ağzı, iç tuğla ve taş eşik */}
          <Path d="M24 140 V72 Q24 48 60 48 Q96 48 96 72 V140 Z" fill="#2a1a15" />
          <Path d="M30 140 V75 Q30 56 60 56 Q90 56 90 75 V140 Z" fill={`url(#${id}-glow)`} />
          <Rect x="0" y="136" width="120" height="6" rx="1" fill="#b7aa98" />
          {/* Odunlar */}
          <Rect x="38" y="124" width="44" height="8" rx="4" fill="#6b4130" transform="rotate(-6 60 128)" />
          <Rect x="38" y="124" width="44" height="8" rx="4" fill="#5a3527" transform="rotate(8 60 128)" />
          {/* Ahşap kiriş raf */}
          <Rect x="-2" y="14" width="124" height="4" fill="rgba(50,25,10,0.3)" transform="translate(0,6)" />
          <Rect x="-2" y="10" width="124" height="10" rx="1.5" fill={`url(#${id}-beam)`} />
          {/* Raftakiler: mumlar, kuru otlu vazo, küçük çerçeve */}
          {[12, 20].map((x, i) => (
            <G key={x}>
              <Rect x={x} y={i ? -2 : -6} width="5" height={i ? 12 : 16} rx="1" fill="#fff4e6" />
              <Circle cx={x + 2.5} cy={i ? -4 : -8} r="1.8" fill="#ffcf6b" />
            </G>
          ))}
          <Path d="M52 10 Q48 2 52 -4 L58 -4 Q62 2 58 10 Z" fill="#c9b8a0" />
          <Path d="M55 -4 Q50 -14 46 -15 M55 -4 Q56 -15 58 -16 M55 -4 Q60 -12 65 -14" stroke="#d8c39b" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <Rect x="88" y="-6" width="20" height="16" fill="#3a2e28" />
          <Rect x="90" y="-4" width="16" height="12" fill="#e8b48a" />
        </Svg>
        {lit && <Flames />}
      </AspectBox>
    </Focusable>
  );
}

function Flames() {
  return (
    <View style={styles.flames} pointerEvents="none">
      <Flame color="#ff7a3c" delay={0} size={1} />
      <Flame color="#ffb347" delay={180} size={0.78} />
      <Flame color="#fff1a8" delay={90} size={0.5} />
    </View>
  );
}

function Flame({ color, delay, size }: { color: string; delay: number; size: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: 320 + delay, useNativeDriver }),
        Animated.timing(v, { toValue: 0, duration: 380 + delay, useNativeDriver }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View
      style={[
        styles.flame,
        {
          width: `${size * 100}%`,
          height: `${size * 100}%`,
          transform: [
            { scaleY: v.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.12] }) },
            { scaleX: v.interpolate({ inputRange: [0, 1], outputRange: [1.04, 0.94] }) },
          ],
        },
      ]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 40 50">
        <Path d="M20 0 C24 12 36 18 36 32 C36 43 29 50 20 50 C11 50 4 43 4 32 C4 22 12 18 14 8 C17 14 18 16 20 0 Z" fill={color} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Ocak ağzının içi: viewBox'a göre yüzdeler.
  // Ocak ağzının içi (viewBox 0 -16 120 156'ya göre yüzdeler).
  flames: { position: 'absolute', left: '33%', width: '34%', top: '62%', height: '30%', alignItems: 'center', justifyContent: 'flex-end' },
  flame: { position: 'absolute', bottom: 0, transformOrigin: 'bottom', boxShadow: '0 0 30px 10px rgba(255,140,60,0.35)', borderRadius: 999 },
});
