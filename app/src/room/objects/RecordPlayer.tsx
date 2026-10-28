import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { useRoom } from '../../state/room';
import { colors } from '../../theme';
import { Focusable } from './Focusable';
import { AspectBox } from './AspectBox';

const useNativeDriver = Platform.OS !== 'web';

/** Ahşap pikap: müzik çalarken plak döner ve notalar süzülür. */
export function RecordPlayer() {
  const playing = useRoom((r) => r.music.playing);
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!playing) return;
    spin.setValue(0);
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver }));
    loop.start();
    return () => loop.stop();
  }, [playing]);

  return (
    <Focusable id="record">
      <AspectBox ratio={120 / 60} align="flex-end">
        <Svg width="100%" height="100%" viewBox="0 0 120 60">
          <Defs>
            <LinearGradient id="rec-wood" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#9a6440" />
              <Stop offset="1" stopColor="#6b4129" />
            </LinearGradient>
          </Defs>
          <Rect x="2" y="10" width="116" height="46" rx="4" fill="url(#rec-wood)" />
          <Rect x="6" y="13" width="108" height="38" rx="3" fill="#2a1a1f" opacity={0.35} />
          {/* Ton kolu */}
          <Circle cx="98" cy="20" r="5" fill="#d8c6b4" />
          <Path d={playing ? 'M98 20 L86 26 L68 30' : 'M98 20 L100 34 L100 44'} stroke="#e8dccf" strokeWidth="2" fill="none" strokeLinecap="round" />
          <Rect x="104" y="40" width="8" height="4" rx="1" fill={playing ? colors.online : '#8a6a5a'} />
          <Rect x="8" y="56" width="6" height="4" fill="#3b2219" />
          <Rect x="106" y="56" width="6" height="4" fill="#3b2219" />
        </Svg>
        <Animated.View
          style={[
            styles.disc,
            { transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] },
          ]}
          pointerEvents="none"
        >
          <Svg width="100%" height="100%" viewBox="0 0 44 44">
            <Circle cx="22" cy="22" r="21" fill="#141016" />
            <G stroke="#2d2630" strokeWidth="0.6" fill="none">
              <Circle cx="22" cy="22" r="17" />
              <Circle cx="22" cy="22" r="14" />
              <Circle cx="22" cy="22" r="11" />
            </G>
            <Circle cx="22" cy="22" r="7" fill={colors.roseDeep} />
            <Path d="M22 17 L24 22 L22 21 Z" fill={colors.gold} />
            <Circle cx="22" cy="22" r="1.2" fill="#f5e6da" />
          </Svg>
        </Animated.View>
        {playing && <Notes />}
      </AspectBox>
    </Focusable>
  );
}

function Notes() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 2400, useNativeDriver }));
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {['♪', '♫'].map((n, i) => (
        <Animated.Text
          key={n}
          style={{
            position: 'absolute',
            left: `${30 + i * 22}%`,
            top: '-10%',
            color: colors.blush,
            fontSize: 12,
            opacity: v.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] }),
            transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -26 - i * 8] }) }],
          }}
        >
          {n}
        </Animated.Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Plak tablası: viewBox 120×60'ta merkez (40, 32), çap 44.
  disc: { position: 'absolute', left: `${(18 / 120) * 100}%`, top: `${(10 / 60) * 100}%`, width: `${(44 / 120) * 100}%`, height: `${(44 / 60) * 100}%` },
});
