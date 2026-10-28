// Dekoratif (etkileşimsiz) mobilyalar: TV ünitesi, halı, lambader, bitki.
import { View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors } from '../../theme';

export function MediaConsole() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 200 50" preserveAspectRatio="xMidYMax meet">
      <Defs>
        <LinearGradient id="console-wood" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#8a5a3c" />
          <Stop offset="1" stopColor="#5e3a26" />
        </LinearGradient>
      </Defs>
      {/* Üstündekiler: mum üçlüsü, kitaplar, küçük bitki */}
      <Rect x="24" y="6" width="5" height="10" rx="1" fill="#fff4e6" />
      <Rect x="31" y="2" width="5" height="14" rx="1" fill="#fff4e6" />
      <Rect x="38" y="9" width="5" height="7" rx="1" fill="#fff4e6" />
      <Circle cx="26.5" cy="4.5" r="1.6" fill="#ffcf6b" />
      <Circle cx="33.5" cy="0.6" r="1.6" fill="#ffcf6b" />
      <Circle cx="40.5" cy="7.5" r="1.6" fill="#ffcf6b" />
      <Rect x="140" y="11" width="26" height="5" rx="1" fill={colors.roseDeep} />
      <Rect x="143" y="7" width="22" height="4" rx="1" fill="#e9d6c6" />
      <Rect x="170" y="8" width="10" height="8" rx="2" fill="#c46a4a" />
      <Path d="M175 8 Q170 -2 166 2 M175 8 Q178 -3 183 1 M175 8 Q175 -4 175 -1" stroke="#5f8f5a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      {/* Gövde */}
      <Rect x="4" y="16" width="192" height="26" rx="3" fill="url(#console-wood)" />
      <Rect x="10" y="21" width="56" height="16" rx="2" fill="none" stroke="rgba(255,230,200,0.18)" />
      <Rect x="72" y="21" width="56" height="16" rx="2" fill="none" stroke="rgba(255,230,200,0.18)" />
      <Rect x="134" y="21" width="56" height="16" rx="2" fill="none" stroke="rgba(255,230,200,0.18)" />
      <Rect x="14" y="42" width="4" height="7" fill="#3b2219" />
      <Rect x="182" y="42" width="4" height="7" fill="#3b2219" />
    </Svg>
  );
}

/** Pencere altındaki alçak dolap (pikap ve kavanoz üstünde durur). */
export function LowCabinet() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 200 50" preserveAspectRatio="none">
      <Rect x="0" y="0" width="200" height="6" rx="2" fill="#a06c48" />
      <Rect x="4" y="6" width="192" height="36" fill="#7d4f33" />
      <Rect x="12" y="11" width="84" height="26" rx="2" fill="none" stroke="rgba(255,230,200,0.2)" />
      <Rect x="104" y="11" width="84" height="26" rx="2" fill="none" stroke="rgba(255,230,200,0.2)" />
      <Circle cx="92" cy="24" r="1.6" fill={colors.gold} />
      <Circle cx="108" cy="24" r="1.6" fill={colors.gold} />
      <Rect x="10" y="42" width="5" height="8" fill="#3b2219" />
      <Rect x="185" y="42" width="5" height="8" fill="#3b2219" />
    </Svg>
  );
}

export function Rug() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 200 50" preserveAspectRatio="none">
      <Ellipse cx="100" cy="25" rx="98" ry="23" fill="#f3e3d3" opacity={0.5} />
      <Ellipse cx="100" cy="25" rx="94" ry="21" fill="#a8456a" />
      <Ellipse cx="100" cy="25" rx="84" ry="17" fill="none" stroke="#f8c9d4" strokeWidth="1.4" strokeDasharray="3 4" />
      <Ellipse cx="100" cy="25" rx="70" ry="13" fill="#c85f86" />
      <Ellipse cx="100" cy="25" rx="50" ry="8" fill="none" stroke="#f3e3d3" strokeWidth="0.8" opacity={0.6} />
    </Svg>
  );
}

export function FloorLamp() {
  return (
    <View style={{ flex: 1 }}>
      <Svg width="100%" height="100%" viewBox="0 0 40 160" preserveAspectRatio="xMidYMax meet">
        <Defs>
          <RadialGradient id="lamp-glow" cx="50%" cy="20%" r="50%">
            <Stop offset="0" stopColor="#ffd890" stopOpacity={0.55} />
            <Stop offset="1" stopColor="#ffd890" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx="20" cy="30" rx="40" ry="50" fill="url(#lamp-glow)" />
        <Path d="M10 8 H30 L36 30 H4 Z" fill="#f6e3c8" />
        <Path d="M4 30 H36 L32 34 H8 Z" fill="#ffe6a8" opacity={0.9} />
        <Rect x="19" y="30" width="2" height="122" fill="#3b2a26" />
        <Ellipse cx="20" cy="154" rx="10" ry="3" fill="#3b2a26" />
      </Svg>
    </View>
  );
}

export function Plant() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 50 80" preserveAspectRatio="xMidYMax meet">
      <G fill="#4f8a5b">
        <Ellipse cx="18" cy="26" rx="9" ry="16" transform="rotate(-25 18 26)" />
        <Ellipse cx="32" cy="22" rx="9" ry="17" transform="rotate(20 32 22)" />
        <Ellipse cx="25" cy="16" rx="7" ry="15" />
      </G>
      <G fill="#6aa874">
        <Ellipse cx="12" cy="40" rx="7" ry="12" transform="rotate(-50 12 40)" />
        <Ellipse cx="38" cy="38" rx="7" ry="12" transform="rotate(50 38 38)" />
      </G>
      <Path d="M12 50 H38 L34 78 H16 Z" fill="#c46a4a" />
      <Rect x="10" y="48" width="30" height="6" rx="2" fill="#d98060" />
    </Svg>
  );
}
