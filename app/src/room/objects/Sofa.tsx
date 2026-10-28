import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import type { Member } from '@loveroom/shared';
import { useRoom, useRoomStore } from '../../state/room';
import { useCall } from '../../call/callStore';
import { MediaView } from '../../call/MediaView';
import { CharacterFigure } from '../../characters/CharacterFigure';
import { useUid } from '../decor/useUid';
import { Focusable } from './Focusable';
import { AspectBox } from './AspectBox';

/** Kanepe oturma yerleri (viewBox 200×110 içinde): sol ve sağ minder merkezleri. */
const SEATS = [70, 130];

/**
 * Pas rengi kadife kanepe. Arka (sırt, kolçaklar) ve ön (oturak minderleri) iki katmanda çizilir;
 * oturanlar arada durur, böylece gerçekten minderlerin üstünde oturuyor gibi görünür.
 * Görüntülü arama açıksa kişinin karakteri yerine videosu oturur.
 */
export function Sofa() {
  const sofa = useRoom((r) => r.sofa);
  const members = useRoom((r) => r.members);
  const seated = members.filter((m) => sofa.includes(m.id));

  return (
    <Focusable id="sofa">
      <AspectBox ratio={200 / 110} align="flex-end">
        <SofaBack />
        {members.map((m, i) =>
          sofa.includes(m.id) ? <Occupant key={m.id} member={m} seat={seated.length === 1 ? 100 : SEATS[i % 2]} /> : null,
        )}
        <SofaFront />
      </AspectBox>
    </Focusable>
  );
}

function Occupant({ member, seat }: { member: Member; seat: number }) {
  const me = useRoomStore((s) => s.userId === member.id);
  const stream = useCall((s) => {
    if (s.status !== 'active' || s.kind !== 'video') return null;
    if (me) return s.camOn ? s.local : null;
    return s.peerId === member.id ? s.remote : null;
  });

  // Karakter kutusu 100×140 oranında; minderin üstüne oturacak şekilde yerleştirilir.
  const w = 60;
  const left = ((seat - w / 2) / 200) * 100;
  return (
    <View style={[styles.occupant, { left: `${left}%`, width: `${(w / 200) * 100}%` }]} pointerEvents="none">
      {stream ? (
        <View style={styles.videoSeat}>
          <MediaView stream={stream} muted={me} mirror={me} />
        </View>
      ) : (
        <CharacterFigure character={member.character} />
      )}
    </View>
  );
}

function SofaBack() {
  const id = useUid('sofa-b');
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 200 110">
      <Defs>
        <LinearGradient id={`${id}-back`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#b9654a" />
          <Stop offset="1" stopColor="#8e4632" />
        </LinearGradient>
        <RadialGradient id={`${id}-cs`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#1a0d05" stopOpacity={0.5} />
          <Stop offset="1" stopColor="#1a0d05" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx="100" cy="106" rx="98" ry="6" fill={`url(#${id}-cs)`} />
      {/* Sırt: kapitone düğmeli */}
      <Path d="M20 70 L20 30 Q20 14 40 14 L160 14 Q180 14 180 30 L180 70 Z" fill={`url(#${id}-back)`} />
      {[60, 100, 140].map((x) =>
        [30, 46].map((y) => <Ellipse key={`${x}-${y}`} cx={x} cy={y} rx="1.6" ry="1.4" fill="rgba(60,20,10,0.45)" />),
      )}
      <Path d="M24 22 Q100 12 176 22" stroke="rgba(255,220,190,0.22)" strokeWidth="2" fill="none" />
      {/* Oturak tabanı: minderlerin arasındaki boşluk duvarı göstermesin */}
      <Rect x="22" y="64" width="156" height="34" rx="4" fill="#7d3c2a" />
      {/* Arka yastıklar */}
      <Rect x="28" y="36" width="34" height="28" rx="10" fill="#7f9a78" transform="rotate(-8 45 50)" />
      <Rect x="140" y="36" width="34" height="28" rx="10" fill="#efe2cb" transform="rotate(8 157 50)" />
    </Svg>
  );
}

function SofaFront() {
  const id = useUid('sofa-f');
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 200 110" pointerEvents="none">
      <Defs>
        <LinearGradient id={`${id}-seat`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#cc7556" />
          <Stop offset="1" stopColor="#9c4d36" />
        </LinearGradient>
        <LinearGradient id={`${id}-arm`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#a75a40" />
          <Stop offset="1" stopColor="#8a432f" />
        </LinearGradient>
      </Defs>
      {/* Oturak minderlerinin ön yüzü */}
      <Rect x="26" y="78" width="74" height="18" rx="7" fill={`url(#${id}-seat)`} />
      <Rect x="100" y="78" width="74" height="18" rx="7" fill={`url(#${id}-seat)`} />
      <Rect x="26" y="78" width="148" height="3" rx="1.5" fill="rgba(255,225,200,0.25)" />
      <Rect x="20" y="94" width="160" height="8" rx="3" fill="#7d3c2a" />
      {/* Kolçaklar */}
      <Rect x="4" y="46" width="28" height="56" rx="13" fill={`url(#${id}-arm)`} />
      <Rect x="168" y="46" width="28" height="56" rx="13" fill={`url(#${id}-arm)`} />
      <Rect x="7" y="48" width="22" height="6" rx="3" fill="rgba(255,225,200,0.2)" />
      <Rect x="171" y="48" width="22" height="6" rx="3" fill="rgba(255,225,200,0.2)" />
      {/* Kolçağa atılmış örgü battaniye */}
      <G>
        <Path d="M160 44 Q178 38 196 48 L198 96 Q182 102 166 94 Z" fill="#f1e3cf" />
        {[0, 1, 2, 3].map((i) => (
          <Path key={i} d={`M${164 + i * 8} ${46 - i} L${168 + i * 8} ${96 + i}`} stroke="#ddc7aa" strokeWidth="2" />
        ))}
      </G>
      {/* Ahşap ayaklar */}
      <Path d="M22 102 L20 109 M178 102 L180 109" stroke="#4a2e1a" strokeWidth="3" strokeLinecap="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  // Karakter 100×140: minder üst kenarına (y≈80/110) oturacak yükseklik.
  occupant: { position: 'absolute', top: '12%', aspectRatio: 100 / 140 },
  videoSeat: {
    position: 'absolute',
    left: '8%',
    right: '8%',
    top: '6%',
    bottom: '18%',
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fbf3e6',
    boxShadow: '0 6px 14px rgba(0,0,0,0.35)',
  },
});
