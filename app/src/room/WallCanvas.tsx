import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, Ellipse, G, Line, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { OBJECT_WALL, type ObjectId, type WallId } from '@loveroom/shared';
import { useRoomStore } from '../state/room';
import { wallThemes } from '../theme';
import { FLOOR_Y, LAYOUT, zoomFor, type Rect as R } from './layout';
import { FairyLights } from './decor/FairyLights';

const useNativeDriver = Platform.OS !== 'web';
/** Odak paneli açıkken zoom hedefi bu kadar yukarı kaydırılır. */
export const FOCUS_PANEL_HEIGHT = 230;

interface Props {
  wall: WallId;
  children: ReactNode;
  /** Duvara özel ek ışık (ör. şömine parıltısı). */
  extraGlow?: ReactNode;
}

/**
 * Tek bir duvarın 2D sahnesi: duvar kâğıdı, lambri, ahşap zemin, peri ışıkları, objeler.
 * Odak (room.focus) bu duvardaki bir objeye geçince sahne o objeye yaklaşır; odak iki
 * kullanıcıda da aynı olduğu için zoom da iki ekranda aynı anda olur.
 */
export function WallCanvas({ wall, children, extraGlow }: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const focusedId = useRoomStore((s) => {
    const id = s.room?.focus?.objectId;
    return id && OBJECT_WALL[id] === wall ? id : null;
  });
  const dispatch = useRoomStore((s) => s.dispatch);

  const scale = useRef(new Animated.Value(1)).current;
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!size.w) return;
    const z = focusedId ? zoomFor(LAYOUT[focusedId], size.w, size.h, FOCUS_PANEL_HEIGHT) : { scale: 1, tx: 0, ty: 0 };
    const spring = (v: Animated.Value, toValue: number) =>
      Animated.spring(v, { toValue, useNativeDriver, friction: 10, tension: 40 });
    Animated.parallel([spring(scale, z.scale), spring(tx, z.tx), spring(ty, z.ty)]).start();
  }, [focusedId, size.w, size.h]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  };

  return (
    <View style={styles.root} onLayout={onLayout}>
      {/* Zoom'da kenarlarda boşluk kalmasın diye sahnenin arkasına aynı renkler. */}
      <WallBackground wall={wall} id={`${wall}-under`} />
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: tx }, { translateY: ty }, { scale }] }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => focusedId && dispatch({ type: 'focus/clear' })}>
          <WallBackground wall={wall} id={wall} />
          {extraGlow}
          <FairyLights seed={wall.length} />
        </Pressable>
        {children}
        <View style={styles.vignette} pointerEvents="none" />
      </Animated.View>
    </View>
  );
}

/** Duvar + lambri + perspektifli ahşap zemin. viewBox 100×100, oranlar esnetilir. */
function WallBackground({ wall, id }: { wall: WallId; id: string }) {
  const t = wallThemes[wall];
  const floorTop = FLOOR_Y * 100;
  const planks = Array.from({ length: 13 }, (_, i) => (i / 12) * 140 - 20);
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={`${id}-wall`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={t.top} />
          <Stop offset="1" stopColor={t.bottom} />
        </LinearGradient>
        <LinearGradient id={`${id}-floor`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#5a3326" />
          <Stop offset="1" stopColor="#2e1914" />
        </LinearGradient>
        <RadialGradient id={`${id}-glow`} cx="50%" cy="30%" rx="60%" ry="55%">
          <Stop offset="0" stopColor={t.glow} />
          <Stop offset="1" stopColor="rgba(0,0,0,0)" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100" height={floorTop} fill={`url(#${id}-wall)`} />
      {/* İnce dikey duvar kâğıdı çizgileri */}
      <G opacity={0.07}>
        {Array.from({ length: 20 }, (_, i) => (
          <Rect key={i} x={i * 5 + 1} y="0" width="1.2" height={floorTop * 0.62} fill="#fff" />
        ))}
      </G>
      {/* Lambri */}
      <Rect x="0" y={floorTop * 0.62} width="100" height={floorTop * 0.38} fill={t.wainscot} />
      <Rect x="0" y={floorTop * 0.62} width="100" height="0.8" fill="rgba(255,235,220,0.25)" />
      {Array.from({ length: 6 }, (_, i) => (
        <Rect
          key={i}
          x={i * 16.6 + 2}
          y={floorTop * 0.67}
          width="12.6"
          height={floorTop * 0.27}
          fill="none"
          stroke="rgba(255,235,220,0.10)"
          strokeWidth="0.4"
        />
      ))}
      <Rect x="0" y="0" width="100" height={floorTop} fill={`url(#${id}-glow)`} />
      {/* Zemin: kaçış noktasına doğru daralan tahtalar */}
      <Rect x="0" y={floorTop} width="100" height={100 - floorTop} fill={`url(#${id}-floor)`} />
      {planks.map((x, i) => (
        <Line key={i} x1={50 + (x - 50) * 0.55} y1={floorTop} x2={x} y2="100" stroke="rgba(0,0,0,0.22)" strokeWidth="0.25" />
      ))}
      <Line x1="0" y1={floorTop + 9} x2="100" y2={floorTop + 9} stroke="rgba(0,0,0,0.12)" strokeWidth="0.25" />
      <Line x1="0" y1={floorTop + 20} x2="100" y2={floorTop + 20} stroke="rgba(0,0,0,0.12)" strokeWidth="0.25" />
      {/* Süpürgelik */}
      <Rect x="0" y={floorTop - 1.6} width="100" height="1.8" fill="#f1dccf" opacity={0.85} />
      <Ellipse cx="50" cy={floorTop + 8} rx="55" ry="10" fill="rgba(255,190,140,0.06)" />
    </Svg>
  );
}

/** Bir objeyi LAYOUT/DECOR'daki normalize konumuna yerleştirir. */
export function Placed({ rect, children, z }: { rect: R; children: ReactNode; z?: number }) {
  return (
    <View
      style={{
        position: 'absolute',
        left: `${rect.x * 100}%`,
        top: `${rect.y * 100}%`,
        width: `${rect.w * 100}%`,
        height: `${rect.h * 100}%`,
        zIndex: z,
      }}
    >
      {children}
    </View>
  );
}

export const placedAt = (id: ObjectId) => LAYOUT[id];

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    boxShadow: 'inset 0 0 120px 30px rgba(10, 2, 14, 0.55)',
  },
});
