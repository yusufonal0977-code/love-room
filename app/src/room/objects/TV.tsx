import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Polygon, Rect, Stop } from 'react-native-svg';
import { useRoom } from '../../state/room';
import { colors, fonts } from '../../theme';
import { Focusable } from './Focusable';
import { AspectBox } from './AspectBox';
import { TvVideo } from './TvVideo';

/** Ekranın SVG içindeki konumu (viewBox 160×92) — video bu alana oturur. */
const SCREEN = { left: 4 / 160, top: 4 / 92, width: 152 / 160, height: 84 / 92 };

/**
 * TV: dokununca iki ekran da TV'ye zoom yapar. Açma/oynatma aksiyonları reducer'da odağı da
 * TV'ye çeker, yani "biri açınca ikisi de TV'ye odaklanır". Video `TvVideo`'da senkronlanır.
 */
export function TV() {
  const tv = useRoom((r) => r.tv);

  return (
    <Focusable id="tv">
      <AspectBox ratio={160 / 92}>
        {tv.on && <View style={styles.ambient} pointerEvents="none" />}
        <Svg width="100%" height="100%" viewBox="0 0 160 92">
          <Defs>
            <LinearGradient id="tv-off" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#1b1520" />
              <Stop offset="1" stopColor="#050307" />
            </LinearGradient>
            <LinearGradient id="tv-idle" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#2b1a4a" />
              <Stop offset="0.6" stopColor="#6b2a5c" />
              <Stop offset="1" stopColor={colors.roseDeep} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="160" height="92" rx="4" fill="#0c090e" stroke="#2d2433" strokeWidth="0.8" />
          <Rect x="4" y="4" width="152" height="84" rx="1.5" fill={tv.on ? 'url(#tv-idle)' : 'url(#tv-off)'} />
          {!tv.on && <Polygon points="4,4 70,4 30,88 4,88" fill="#fff" opacity={0.04} />}
          {tv.on && !tv.mediaUrl && (
            <Path
              d="M80 58 C70 51 66 46 66 41 C66 37.5 68.7 35 72 35 C75 35 77.4 36.9 80 39.3 C82.6 36.9 85 35 88 35 C91.3 35 94 37.5 94 41 C94 46 90 51 80 58 Z"
              fill={colors.blush}
              opacity={0.9}
            />
          )}
          <Circle cx="152" cy="90" r="0.9" fill={tv.on ? '#7ee0a1' : '#e2557a'} />
        </Svg>

        {tv.on && tv.mediaUrl && (
          <View style={[styles.screen, { pointerEvents: 'none' }]}>
            <TvVideo key={tv.mediaUrl} tv={tv} />
          </View>
        )}
        {tv.on && !tv.mediaUrl && (
          <View style={[styles.screen, styles.idle]} pointerEvents="none">
            <Text style={styles.idleText}>Bu akşam ne izliyoruz?</Text>
          </View>
        )}
      </AspectBox>
    </Focusable>
  );
}

const styles = StyleSheet.create({
  ambient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
    boxShadow: '0 0 60px 18px rgba(140, 150, 255, 0.35)',
  },
  screen: {
    position: 'absolute',
    left: `${SCREEN.left * 100}%`,
    top: `${SCREEN.top * 100}%`,
    width: `${SCREEN.width * 100}%`,
    height: `${SCREEN.height * 100}%`,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  idle: { backgroundColor: 'transparent', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: '6%' },
  idleText: { color: colors.cream, fontFamily: fonts.displayLight, fontSize: 13, opacity: 0.9 },
});
