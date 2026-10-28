import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Polygon, Rect, Stop } from 'react-native-svg';
import { useRoom } from '../../state/room';
import { colors, fonts } from '../../theme';
import { useUid } from '../decor/useUid';
import { Focusable } from './Focusable';
import { AspectBox } from './AspectBox';
import { TvVideo } from './TvVideo';

/** 16:9 ekran, ince çerçeve. viewBox 168×97; ekran alanı aşağıdaki oranlarda. */
const SCREEN = { left: 2.5 / 168, top: 2.5 / 97, width: 163 / 168, height: 92 / 97 };

/**
 * Duvara asılı ince TV. Dokununca iki ekran da TV'ye zoom yapar; açma/oynatma da odağı TV'ye çeker.
 * Açıkken arkasına duvara mavi-beyaz bir arka ışık vurur. Video `TvVideo`'da senkronlanır.
 */
export function TV() {
  const tv = useRoom((r) => r.tv);
  const id = useUid('tv');

  return (
    <Focusable id="tv">
      <AspectBox ratio={168 / 97}>
        {tv.on && <View style={styles.backlight} pointerEvents="none" />}
        <View style={styles.wallShadow} pointerEvents="none" />
        <Svg width="100%" height="100%" viewBox="0 0 168 97">
          <Defs>
            <LinearGradient id={`${id}-off`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#24201f" />
              <Stop offset="1" stopColor="#0b0a0a" />
            </LinearGradient>
            <LinearGradient id={`${id}-idle`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#2c3a4a" />
              <Stop offset="0.55" stopColor="#7a4a3a" />
              <Stop offset="1" stopColor="#d9785a" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="168" height="97" rx="2.5" fill="#141110" />
          <Rect x="2.5" y="2.5" width="163" height="92" rx="1" fill={tv.on ? `url(#${id}-idle)` : `url(#${id}-off)`} />
          {!tv.on && <Polygon points="2.5,2.5 80,2.5 40,94.5 2.5,94.5" fill="#fff" opacity={0.05} />}
          {tv.on && !tv.mediaUrl && (
            <Path
              d="M84 58 C74 51 70 46 70 41 C70 37.5 72.7 35 76 35 C79 35 81.4 36.9 84 39.3 C86.6 36.9 89 35 92 35 C95.3 35 98 37.5 98 41 C98 46 94 51 84 58 Z"
              fill={colors.blush}
              opacity={0.9}
            />
          )}
          <Rect x="78" y="95.2" width="12" height="1" rx="0.5" fill={tv.on ? '#7ed49a' : '#5a4a44'} />
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
  backlight: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
    boxShadow: '0 0 80px 26px rgba(150, 175, 255, 0.4)',
  },
  wallShadow: { ...StyleSheet.absoluteFillObject, boxShadow: '6px 12px 18px rgba(40,20,8,0.35)' },
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
