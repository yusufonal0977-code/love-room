import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { colors } from '../theme';
import { Body, Title } from './Txt';

/** Kalp şeklinde pencereli küçük bir ev: "ayrı şehirlerde aynı ev". */
export function LogoMark({ size = 72 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.rose} />
          <Stop offset="1" stopColor={colors.roseDeep} />
        </LinearGradient>
      </Defs>
      <Path d="M8 30 L32 9 L56 30 V54 a4 4 0 0 1 -4 4 H12 a4 4 0 0 1 -4 -4 Z" fill="url(#logo-g)" />
      <Rect x="44" y="12" width="6" height="11" rx="1.5" fill={colors.roseDeep} />
      <Path
        d="M32 48 C22 41 19 36 19 31.5 C19 28 21.7 25.5 25 25.5 C28 25.5 30.4 27.4 32 29.8 C33.6 27.4 36 25.5 39 25.5 C42.3 25.5 45 28 45 31.5 C45 36 42 41 32 48 Z"
        fill={colors.gold}
      />
    </Svg>
  );
}

export function Logo({ tagline = true }: { tagline?: boolean }) {
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <LogoMark />
      <Title size={44} center>
        Love Room
      </Title>
      {tagline && (
        <Body center color={colors.textDim} size={16}>
          Kilometreler arada, kalbimiz aynı odada.
        </Body>
      )}
    </View>
  );
}
