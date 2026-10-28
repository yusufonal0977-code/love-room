import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect, Text as SvgText } from 'react-native-svg';
import { useRoomStore } from '../../state/room';
import { colors, fonts } from '../../theme';
import { Focusable } from './Focusable';
import { AspectBox } from './AspectBox';

const NOTES = [
  { x: 14, y: 52, r: -12, c: '#f8c9d4' },
  { x: 30, y: 56, r: 8, c: '#f7c873' },
  { x: 20, y: 40, r: 14, c: '#cfe3f7' },
  { x: 34, y: 42, r: -6, c: '#f8c9d4' },
  { x: 24, y: 28, r: 4, c: '#fff1d6' },
];

/** Katlanmış notlarla dolu cam kavanoz. Cevabını bekleyen bir soru varsa üstünde rozet çıkar. */
export function QuestionJar() {
  const waitingForMe = useRoomStore((s) => {
    const q = s.room?.question;
    return !!q && !!s.userId && !q.answers[s.userId];
  });

  return (
    <Focusable id="jar">
      <AspectBox ratio={60 / 80} align="flex-end">
        <Svg width="100%" height="100%" viewBox="0 0 60 80">
          {/* Notlar (camın arkasında) */}
          {NOTES.map((n, i) => (
            <Rect key={i} x={n.x} y={n.y} width="12" height="9" rx="1.5" fill={n.c} transform={`rotate(${n.r} ${n.x + 6} ${n.y + 4})`} />
          ))}
          {/* Cam */}
          <Path d="M10 22 Q8 24 8 30 V70 Q8 78 16 78 H44 Q52 78 52 70 V30 Q52 24 50 22 Z" fill="rgba(220,235,255,0.22)" stroke="rgba(255,255,255,0.55)" strokeWidth="1.2" />
          <Path d="M14 30 V66" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" />
          {/* Kapak ve kurdele */}
          <Rect x="9" y="14" width="42" height="9" rx="2" fill="#c9a27a" />
          <Rect x="9" y="17" width="42" height="3" fill={colors.roseDeep} />
          <Path d="M30 18 C24 10 18 14 24 18 C18 22 24 26 30 18 Z M30 18 C36 10 42 14 36 18 C42 22 36 26 30 18 Z" fill={colors.rose} />
          {/* Etiket */}
          <Rect x="16" y="44" width="28" height="12" rx="2" fill="#fffaf2" stroke="#e6d2c0" strokeWidth="0.6" />
          <SvgText x="30" y="52" textAnchor="middle" fontSize="5.5" fontFamily={fonts.displayLight} fill="#7a4a5a">
            Bize dair
          </SvgText>
        </Svg>
        {waitingForMe && (
          <View style={styles.badge} pointerEvents="none">
            <Text style={styles.badgeText}>?</Text>
          </View>
        )}
      </AspectBox>
    </Focusable>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.rose,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 10px 2px rgba(236,122,150,0.7)',
  },
  badgeText: { color: '#fff', fontSize: 10, fontFamily: fonts.bodyBold },
});
