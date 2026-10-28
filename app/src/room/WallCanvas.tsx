import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, Ellipse, G, Line, LinearGradient, Mask, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';
import { OBJECT_WALL, type ObjectId, type WallId } from '@loveroom/shared';
import { useRoomStore } from '../state/room';
import { wallColors } from '../theme';
import { FLOOR_Y, LAYOUT, zoomFor, type Rect as R } from './layout';
import type { Lighting } from './lighting';
import { FairyLights } from './decor/FairyLights';

const useNativeDriver = Platform.OS !== 'web';
/** Odak paneli açıkken zoom hedefi bu kadar yukarı kaydırılır. */
export const FOCUS_PANEL_HEIGHT = 230;

/** Normalize koordinatlarda (0–1) bir ışık havuzu: lamba, şömine, TV, pencere. */
export interface LightSource {
  x: number;
  y: number;
  rx: number;
  ry: number;
  color: string;
  /** 0–1 */
  strength: number;
}

interface Props {
  wall: WallId;
  lighting: Lighting;
  /** Işık/karanlık katmanlarından etkilenen eşyalar (çoğu şey). */
  children: ReactNode;
  /** Kendi ışığı olan, karanlıktan etkilenmeyen eşyalar (ör. açık TV ekranı). */
  emissive?: ReactNode;
  lights?: LightSource[];
  fairyLights?: boolean;
}

/**
 * Tek bir duvarın sahnesi. Katman sırası:
 * duvar/zemin → eşyalar → gece/altın saat katmanı → ışık havuzları → kendi ışığı olan eşyalar.
 * Odak (room.focus) bu duvardaki bir objeye geçince sahne o objeye yaklaşır; odak iki
 * kullanıcıda da aynı olduğu için zoom da iki ekranda aynı anda olur.
 */
export function WallCanvas({ wall, lighting, children, emissive, lights = [], fairyLights }: Props) {
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
      {/* Zoom'da kenarlarda boşluk kalmasın diye sahnenin arkasına aynı oda. */}
      <WallBackground wall={wall} id={`${wall}-under`} />
      <Ambient lighting={lighting} />
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: tx }, { translateY: ty }, { scale }] }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => focusedId && dispatch({ type: 'focus/clear' })}>
          <WallBackground wall={wall} id={wall} />
        </Pressable>
        {children}
        <Atmosphere id={wall} lighting={lighting} lights={lights} />
        {fairyLights && <FairyLights intensity={lighting.lamps} />}
        {emissive}
        <View style={styles.vignette} pointerEvents="none" />
      </Animated.View>
    </View>
  );
}

/** Zoom sırasında kenarda görünen alt katman için basit karanlık/ton. */
function Ambient({ lighting }: { lighting: Lighting }) {
  return (
    <View
      style={[StyleSheet.absoluteFill, { backgroundColor: '#090b1c', opacity: Math.min(0.85, lighting.night * 1.35) }]}
      pointerEvents="none"
    />
  );
}

/**
 * Oda atmosferi: gece karanlığı bir maskeyle çizilir; her ışık kaynağı karanlıkta yumuşak bir "delik" açar.
 * Böylece lambanın/şöminenin çevresindeki eşyalar sisli bir parıltı altında değil, kendi gerçek renkleriyle
 * aydınlanmış görünür. Üstüne ışığın rengini veren hafif bir sıcak ton eklenir.
 */
function Atmosphere({ id, lighting, lights }: { id: string; lighting: Lighting; lights: LightSource[] }) {
  const visible = lights.filter((l) => l.strength > 0.02);
  const dark = Math.min(0.86, lighting.night * 1.4);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Defs>
          {visible.map((l, i) => (
            <RadialGradient key={`h${i}`} id={`${id}-hole-${i}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#000" stopOpacity={Math.min(1, l.strength * 1.1)} />
              <Stop offset="0.55" stopColor="#000" stopOpacity={0.55 * l.strength} />
              <Stop offset="1" stopColor="#000" stopOpacity={0} />
            </RadialGradient>
          ))}
          {visible.map((l, i) => (
            <RadialGradient key={`t${i}`} id={`${id}-tint-${i}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={l.color} stopOpacity={0.32 * l.strength} />
              <Stop offset="1" stopColor={l.color} stopOpacity={0} />
            </RadialGradient>
          ))}
          <Mask id={`${id}-mask`} x="0" y="0" width="100" height="100" maskUnits="userSpaceOnUse">
            <Rect x="0" y="0" width="100" height="100" fill="#fff" />
            {visible.map((l, i) => (
              <Ellipse key={i} cx={l.x * 100} cy={l.y * 100} rx={l.rx * 100} ry={l.ry * 100} fill={`url(#${id}-hole-${i})`} />
            ))}
          </Mask>
        </Defs>
        {lighting.morning > 0 && <Rect x="0" y="0" width="100" height="100" fill="#ffd9c8" opacity={lighting.morning * 0.7} />}
        {lighting.golden > 0 && <Rect x="0" y="0" width="100" height="100" fill="#ff9a45" opacity={lighting.golden * 0.75} />}
        {dark > 0 && <Rect x="0" y="0" width="100" height="100" fill="#090b1c" opacity={dark} mask={`url(#${id}-mask)`} />}
        {visible.map((l, i) => (
          <Ellipse key={i} cx={l.x * 100} cy={l.y * 100} rx={l.rx * 100} ry={l.ry * 100} fill={`url(#${id}-tint-${i})`} />
        ))}
      </Svg>
    </View>
  );
}

/**
 * Duvar: tavan + korniş, sıva, lambri, süpürgelik; zemin: perspektifli ahşap parke.
 * Köşelerde ve birleşim yerlerinde ortam gölgesi (ambient occlusion) derinlik verir.
 * viewBox 100×100, oranlar esnetilir.
 */
function WallBackground({ wall, id }: { wall: WallId; id: string }) {
  const style = useRoomStore((s) => s.room?.style ?? 'cream');
  const t = wallColors(style, wall);
  const floor = FLOOR_Y * 100;
  const ceil = 4.5;
  const rail = floor * 0.6;
  const planks = Array.from({ length: 15 }, (_, i) => (i / 14) * 160 - 30);
  const rows = [floor + 4, floor + 10, floor + 18, floor + 28];

  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={`${id}-wall`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={t.top} />
          <Stop offset="1" stopColor={t.bottom} />
        </LinearGradient>
        <LinearGradient id={`${id}-wains`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={t.wainscot} />
          <Stop offset="1" stopColor={t.wainscot} stopOpacity={0.85} />
        </LinearGradient>
        <LinearGradient id={`${id}-floor`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#9c6a40" />
          <Stop offset="0.5" stopColor="#b47c4a" />
          <Stop offset="1" stopColor="#8a5a34" />
        </LinearGradient>
        <RadialGradient id={`${id}-sheen`} cx="50%" cy="20%" r="60%">
          <Stop offset="0" stopColor="#fff2dc" stopOpacity={0.28} />
          <Stop offset="1" stopColor="#fff2dc" stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id={`${id}-aoL`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#3a2414" stopOpacity={0.32} />
          <Stop offset="1" stopColor="#3a2414" stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id={`${id}-aoR`} x1="1" y1="0" x2="0" y2="0">
          <Stop offset="0" stopColor="#3a2414" stopOpacity={0.32} />
          <Stop offset="1" stopColor="#3a2414" stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id={`${id}-aoTop`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#3a2414" stopOpacity={0.22} />
          <Stop offset="1" stopColor="#3a2414" stopOpacity={0} />
        </LinearGradient>
        <LinearGradient id={`${id}-aoFloor`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#24140b" stopOpacity={0.45} />
          <Stop offset="1" stopColor="#24140b" stopOpacity={0} />
        </LinearGradient>
        <RadialGradient id={`${id}-wallLight`} cx="50%" cy="25%" r="65%">
          <Stop offset="0" stopColor="#fffaf0" stopOpacity={0.35} />
          <Stop offset="1" stopColor="#fffaf0" stopOpacity={0} />
        </RadialGradient>
      </Defs>

      {/* Duvar ve yumuşak tepe ışığı */}
      <Rect x="0" y="0" width="100" height={floor} fill={`url(#${id}-wall)`} />
      <Rect x="0" y="0" width="100" height={floor} fill={`url(#${id}-wallLight)`} />

      {/* Lambri: panel çıtaları (açık kenar + koyu gölge = kabartma hissi) */}
      <Rect x="0" y={rail} width="100" height={floor - rail} fill={`url(#${id}-wains)`} />
      {Array.from({ length: 5 }, (_, i) => {
        const x = 3 + i * 19.4;
        const y = rail + 3;
        const h = floor - rail - 6.5;
        return (
          <G key={i}>
            <Rect x={x + 0.3} y={y + 0.4} width="15.4" height={h} fill="none" stroke="rgba(40,25,15,0.28)" strokeWidth="0.5" />
            <Rect x={x} y={y} width="15.4" height={h} fill="none" stroke="rgba(255,250,240,0.35)" strokeWidth="0.45" />
          </G>
        );
      })}
      {/* Sandalye pervazı */}
      <Rect x="0" y={rail - 1.2} width="100" height="1.4" fill={t.trim} />
      <Rect x="0" y={rail + 0.2} width="100" height="1.2" fill="rgba(40,25,15,0.18)" />

      {/* Tavan ve korniş */}
      <Rect x="0" y="0" width="100" height={ceil} fill="#f8f2e8" />
      <Rect x="0" y={ceil} width="100" height="1.6" fill={t.trim} />
      <Rect x="0" y={ceil + 1.6} width="100" height="0.5" fill="rgba(60,40,25,0.25)" />
      <Rect x="0" y={ceil + 2.1} width="100" height="6" fill={`url(#${id}-aoTop)`} />

      {/* Zemin */}
      <Rect x="0" y={floor} width="100" height={100 - floor} fill={`url(#${id}-floor)`} />
      {planks.map((x, i) => (
        <Line key={i} x1={50 + (x - 50) * 0.62} y1={floor} x2={x} y2="100" stroke="rgba(60,32,14,0.35)" strokeWidth="0.22" />
      ))}
      {rows.map((y, r) =>
        planks.slice(0, -1).map((x, i) =>
          (i + r) % 3 === 0 ? (
            <Line
              key={`${r}-${i}`}
              x1={50 + (x - 50) * (0.62 + (y - floor) * 0.0127)}
              y1={y}
              x2={50 + (planks[i + 1] - 50) * (0.62 + (y - floor) * 0.0127)}
              y2={y}
              stroke="rgba(60,32,14,0.28)"
              strokeWidth="0.2"
            />
          ) : null,
        ),
      )}
      <Rect x="0" y={floor} width="100" height={100 - floor} fill={`url(#${id}-sheen)`} />

      {/* Süpürgelik + zemindeki temas gölgesi */}
      <Rect x="0" y={floor} width="100" height="5" fill={`url(#${id}-aoFloor)`} />
      <Rect x="0" y={floor - 2.4} width="100" height="2.6" fill={t.trim} />
      <Rect x="0" y={floor - 2.4} width="100" height="0.4" fill="rgba(255,255,255,0.5)" />

      {/* Yan duvarların ucu (perspektif) ve köşe gölgeleri */}
      <Polygon points={`0,${ceil} 2.6,${ceil + 2.4} 2.6,${floor - 1.2} 0,${floor + 2.5}`} fill="rgba(80,50,30,0.16)" />
      <Polygon points={`100,${ceil} 97.4,${ceil + 2.4} 97.4,${floor - 1.2} 100,${floor + 2.5}`} fill="rgba(80,50,30,0.16)" />
      <Rect x="0" y="0" width="12" height="100" fill={`url(#${id}-aoL)`} />
      <Rect x="88" y="0" width="12" height="100" fill={`url(#${id}-aoR)`} />
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
  root: { flex: 1, overflow: 'hidden', backgroundColor: '#1c1410' },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    boxShadow: 'inset 0 0 140px 20px rgba(20, 10, 4, 0.35)',
  },
});
