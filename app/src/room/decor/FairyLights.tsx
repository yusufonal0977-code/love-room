import { useEffect, useMemo, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const useNativeDriver = Platform.OS !== 'web';
const BULBS = 13;

/**
 * Kornişten sarkan peri ışıkları; ampuller sırayla yavaşça parlar.
 * `intensity` (0–1) saate göre gelir: gündüz sönük, akşam/gece parlak.
 */
export function FairyLights({ intensity = 1 }: { intensity?: number }) {
  const points = useMemo(
    () =>
      Array.from({ length: BULBS }, (_, i) => {
        const x = 0.06 + (i / (BULBS - 1)) * 0.88;
        const local = ((x - 0.06) / 0.88) * 3;
        return { x, y: 0.075 + Math.sin((local % 1) * Math.PI) * 0.035 };
      }),
    [],
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Path
          d="M6 7.2 Q15.8 11.5 25.6 7.2 Q35.4 11.5 45.2 7.2 Q55 11.5 64.8 7.2 Q74.6 11.5 84.4 7.2 Q89 9.4 94 7.2"
          stroke="rgba(60,45,35,0.55)"
          strokeWidth="0.2"
          fill="none"
        />
      </Svg>
      {points.map((p, i) => (
        <Bulb key={i} left={p.x} top={p.y} delay={(i * 397) % 2600} intensity={intensity} />
      ))}
    </View>
  );
}

function Bulb({ left, top, delay, intensity }: { left: number; top: number; delay: number; intensity: number }) {
  const glow = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(glow, { toValue: 1, duration: 1800, useNativeDriver }),
        Animated.timing(glow, { toValue: 0.6, duration: 1800, useNativeDriver }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const lit = intensity > 0.3;
  return (
    <Animated.View
      style={[
        styles.bulb,
        {
          left: `${left * 100}%`,
          top: `${top * 100}%`,
          backgroundColor: lit ? '#ffd88f' : '#e9dcc4',
          boxShadow: lit ? `0 0 ${6 + 8 * intensity}px ${2 + 2 * intensity}px rgba(255,196,110,${0.35 + 0.4 * intensity})` : 'none',
          opacity: Animated.multiply(glow, 0.45 + 0.55 * intensity),
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  bulb: { position: 'absolute', width: 5, height: 7, marginLeft: -2.5, borderRadius: 3 },
});
