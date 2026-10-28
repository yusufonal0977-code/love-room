import { useEffect, useMemo, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const useNativeDriver = Platform.OS !== 'web';
const BULBS = 15;

/** Duvarın üstünden sarkan peri ışıkları; ampuller sırayla yavaşça parlar. */
export function FairyLights({ seed = 0 }: { seed?: number }) {
  // İki sarkma noktası arasında yumuşak bir eğri; ampuller eğri üzerinde.
  const points = useMemo(
    () =>
      Array.from({ length: BULBS }, (_, i) => {
        const x = (i + 0.5) / BULBS;
        const local = (x * 2) % 1;
        return { x, y: 0.035 + Math.sin(local * Math.PI) * 0.045 };
      }),
    [],
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Path d="M0 3 Q25 12 50 3 Q75 12 100 3" stroke="rgba(40,25,30,0.7)" strokeWidth="0.25" fill="none" />
      </Svg>
      {points.map((p, i) => (
        <Bulb key={i} left={p.x} top={p.y} delay={((i + seed) * 397) % 2600} warm={i % 3 !== 0} />
      ))}
    </View>
  );
}

function Bulb({ left, top, delay, warm }: { left: number; top: number; delay: number; warm: boolean }) {
  const glow = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(glow, { toValue: 1, duration: 1600, useNativeDriver }),
        Animated.timing(glow, { toValue: 0.55, duration: 1600, useNativeDriver }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const color = warm ? '#ffd58a' : '#ffb3c4';
  return (
    <Animated.View
      style={[
        styles.bulb,
        {
          left: `${left * 100}%`,
          top: `${top * 100}%`,
          backgroundColor: color,
          boxShadow: `0 0 10px 3px ${warm ? 'rgba(255,200,110,0.65)' : 'rgba(255,150,180,0.6)'}`,
          opacity: glow,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  bulb: { position: 'absolute', width: 6, height: 8, marginLeft: -3, borderRadius: 4 },
});
