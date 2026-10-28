import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useRoom } from '../../state/room';
import { Focusable } from './Focusable';
import { AspectBox } from './AspectBox';

const useNativeDriver = Platform.OS !== 'web';

/** Taş şömine: rafında mumlar, içinde titreyen alevler. Yakıp söndürmek iki ekranda senkron. */
export function Fireplace() {
  const lit = useRoom((r) => r.fireplaceLit);
  return (
    <Focusable id="fireplace">
      <AspectBox ratio={120 / 140} align="flex-end">
        <Svg width="100%" height="100%" viewBox="0 0 120 140">
          <Defs>
            <RadialGradient id="fire-glow" cx="50%" cy="80%" r="60%">
              <Stop offset="0" stopColor={lit ? '#ffb15c' : '#3a2a26'} stopOpacity={lit ? 0.9 : 1} />
              <Stop offset="1" stopColor="#1a0e0c" />
            </RadialGradient>
          </Defs>
          {/* Gövde: taş */}
          <Rect x="6" y="18" width="108" height="122" rx="3" fill="#e9dccd" />
          <G stroke="#cdbba8" strokeWidth="0.8">
            {[34, 50, 66, 82, 98, 114, 130].map((y, i) => (
              <Path key={y} d={`M6 ${y} H114 M${i % 2 ? 30 : 18} ${y - 16} V${y} M${i % 2 ? 70 : 58} ${y - 16} V${y} M${i % 2 ? 104 : 94} ${y - 16} V${y}`} />
            ))}
          </G>
          {/* Ocak ağzı */}
          <Path d="M24 140 V72 Q24 48 60 48 Q96 48 96 72 V140 Z" fill="#2d1c18" />
          <Path d="M30 140 V75 Q30 56 60 56 Q90 56 90 75 V140 Z" fill="url(#fire-glow)" />
          {/* Odunlar */}
          <Rect x="38" y="124" width="44" height="8" rx="4" fill="#6b4130" transform="rotate(-6 60 128)" />
          <Rect x="38" y="124" width="44" height="8" rx="4" fill="#5a3527" transform="rotate(8 60 128)" />
          {/* Raf ve mumlar */}
          <Rect x="0" y="12" width="120" height="9" rx="2" fill="#7a4b35" />
          {[14, 22, 98, 106].map((x, i) => (
            <G key={x}>
              <Rect x={x} y={i % 2 ? 2 : -2} width="5" height={i % 2 ? 10 : 14} rx="1" fill="#fff4e6" />
              <Circle cx={x + 2.5} cy={i % 2 ? 0 : -4} r="1.6" fill="#ffcf6b" />
            </G>
          ))}
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
  flames: { position: 'absolute', left: '33%', width: '34%', top: '58%', height: '34%', alignItems: 'center', justifyContent: 'flex-end' },
  flame: { position: 'absolute', bottom: 0, transformOrigin: 'bottom', boxShadow: '0 0 30px 10px rgba(255,140,60,0.35)', borderRadius: 999 },
});
