import { StyleSheet, View } from 'react-native';
import Svg, { Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { useRoom } from '../../state/room';
import { Avatar } from '../../ui/Avatar';
import { colors } from '../../theme';
import { Focusable } from './Focusable';
import { AspectBox } from './AspectBox';

/** Kadife kanepe; oturan kullanıcılar avatarlarıyla yan yana görünür. */
export function Sofa() {
  // Seçiciler sabit referans döndürmeli; türetilmiş liste bileşende hesaplanır.
  const sofa = useRoom((r) => r.sofa);
  const members = useRoom((r) => r.members);
  const seated = members.filter((m) => sofa.includes(m.id));

  return (
    <Focusable id="sofa">
      <AspectBox ratio={200 / 110} align="flex-end">
        <Svg width="100%" height="100%" viewBox="0 0 200 110">
          <Defs>
            <LinearGradient id="sofa-back" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#9a4f72" />
              <Stop offset="1" stopColor="#6e3452" />
            </LinearGradient>
            <LinearGradient id="sofa-seat" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#b0618a" />
              <Stop offset="1" stopColor="#7d3d5e" />
            </LinearGradient>
          </Defs>
          {/* Gölge ve ayaklar */}
          <Rect x="14" y="104" width="172" height="5" rx="2.5" fill="rgba(0,0,0,0.3)" />
          <Rect x="22" y="96" width="5" height="10" rx="1.5" fill="#3b2219" />
          <Rect x="173" y="96" width="5" height="10" rx="1.5" fill="#3b2219" />
          {/* Sırt */}
          <Rect x="18" y="16" width="164" height="58" rx="16" fill="url(#sofa-back)" />
          <Rect x="30" y="24" width="68" height="42" rx="12" fill="#a85a80" />
          <Rect x="102" y="24" width="68" height="42" rx="12" fill="#a85a80" />
          {/* Oturak */}
          <Rect x="16" y="62" width="168" height="36" rx="10" fill="url(#sofa-seat)" />
          <Rect x="28" y="60" width="72" height="16" rx="7" fill="#c06e97" />
          <Rect x="100" y="60" width="72" height="16" rx="7" fill="#c06e97" />
          {/* Kolçaklar */}
          <Rect x="2" y="44" width="28" height="56" rx="13" fill="#8a4566" />
          <Rect x="170" y="44" width="28" height="56" rx="13" fill="#8a4566" />
          {/* Kalp yastık */}
          <Path
            d="M48 62 C36 54 32 49 32 43.5 C32 39.4 35.1 36.5 39 36.5 C42.4 36.5 45.6 38.6 48 41.6 C50.4 38.6 53.6 36.5 57 36.5 C60.9 36.5 64 39.4 64 43.5 C64 49 60 54 48 62 Z"
            fill={colors.gold}
          />
          {/* Kolçağa atılmış örgü battaniye */}
          <G>
            <Path d="M150 40 Q168 34 186 44 L188 92 Q172 98 156 90 Z" fill="#f3e3d3" />
            {[0, 1, 2, 3].map((i) => (
              <Path key={i} d={`M${154 + i * 8} ${42 - i} L${158 + i * 8} ${92 + i}`} stroke="#e1c7b2" strokeWidth="2" />
            ))}
          </G>
        </Svg>
        <View style={styles.seats} pointerEvents="none">
          {seated.map((m) => (
            <View key={m.id} style={styles.seat}>
              <Avatar name={m.name} url={m.avatarUrl} size={26} ring={colors.cream} />
            </View>
          ))}
        </View>
      </AspectBox>
    </Focusable>
  );
}

const styles = StyleSheet.create({
  seats: { position: 'absolute', left: '22%', right: '22%', top: '26%', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  seat: { boxShadow: '0 4px 10px rgba(0,0,0,0.35)', borderRadius: 999 },
});
