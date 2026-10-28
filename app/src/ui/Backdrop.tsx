import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Animated, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme';

const useNativeDriver = Platform.OS !== 'web';

/** Giriş/kurulum ekranlarının arka planı: gece gradyanı, yumuşak ışık lekeleri ve yanıp sönen yıldızlar. */
export function Backdrop({ children }: { children: ReactNode }) {
  return (
    <View style={styles.root}>
      <LinearGradient colors={['#1e1510', '#3a271b', '#6b4127']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <View style={[styles.blob, { top: -120, left: -80, backgroundColor: 'rgba(217,120,90,0.20)' }]} />
      <View style={[styles.blob, { bottom: -140, right: -100, backgroundColor: 'rgba(247,200,115,0.14)' }]} />
      <Stars />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.column}>{children}</View>
      </ScrollView>
    </View>
  );
}

function Stars() {
  const stars = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        left: `${(i * 37) % 100}%` as const,
        top: `${(i * 53) % 100}%` as const,
        size: 1.5 + ((i * 7) % 3),
        delay: (i * 211) % 2400,
      })),
    [],
  );
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map((s, i) => (
        <Twinkle key={i} {...s} />
      ))}
    </View>
  );
}

function Twinkle({ left, top, size, delay }: { left: `${number}%`; top: `${number}%`; size: number; delay: number }) {
  const v = useRef(new Animated.Value(0.2)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: 1400, useNativeDriver }),
        Animated.timing(v, { toValue: 0.2, duration: 1400, useNativeDriver }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View
      style={{ position: 'absolute', left, top, width: size, height: size, borderRadius: size, backgroundColor: '#fff', opacity: v }}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.night, overflow: 'hidden' },
  blob: { position: 'absolute', width: 380, height: 380, borderRadius: 999, filter: 'blur(60px)' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  column: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: 18 },
});
