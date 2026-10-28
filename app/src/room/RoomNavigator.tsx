import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { Animated, PanResponder, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { OBJECT_WALL, WALLS, type WallId } from '@loveroom/shared';
import { useRoomStore } from '../state/room';
import { BackWall, FrontWall, LeftWall, RightWall } from './walls/Walls';
import { Hud } from './Hud';
import { FocusPanel } from './FocusPanel';
import { ReactionLayer } from './ReactionLayer';
import { MusicPlayer } from './MusicPlayer';
import { CallOverlay } from '../call/CallOverlay';

const WALL_COMPONENTS: Record<WallId, ComponentType> = {
  front: FrontWall,
  right: RightWall,
  back: BackWall,
  left: LeftWall,
};

const mod = (n: number, m: number) => ((n % m) + m) % m;
const SWIPE_THRESHOLD = 0.22;

/**
 * 4 duvarlı oda: kesintisiz döngü (Ön → Sağ → Arka → Sol → Ön), sağa kaydırmak sağa dönmek gibi.
 * Aynı anda yalnızca önceki/mevcut/sonraki duvar render edilir; sürükleme `dragX` ile hepsini kaydırır.
 * Odak senkronu: karşı taraf başka duvardaki bir objeye odaklanırsa bu ekran o duvara döner.
 */
export function RoomNavigator() {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const dragX = useRef(new Animated.Value(0)).current;

  const focus = useRoomStore((s) => s.room?.focus ?? null);
  const dispatch = useRoomStore((s) => s.dispatch);
  const focusRef = useRef(focus);
  focusRef.current = focus;

  // Uzaktan (ya da yerelden) gelen odak → ilgili duvara geç; zoom'u WallCanvas yapar.
  useEffect(() => {
    if (focus) setIndex(WALLS.indexOf(OBJECT_WALL[focus.objectId]));
  }, [focus?.objectId, focus?.at]);

  // Yeni duvar commit edilince boyamadan önce kaydırmayı sıfırla (titreme olmaz).
  useLayoutEffect(() => {
    dragX.setValue(0);
  }, [index]);

  // Ref: PanResponder bir kez oluşturulur ama her zaman güncel `width`'i görmeli.
  const go = useRef<(dir: 1 | -1) => void>(() => {});
  go.current = (dir) => {
    if (focusRef.current) return;
    Animated.timing(dragX, { toValue: -dir * width, duration: 260, useNativeDriver: false }).start(({ finished }) => {
      if (finished) setIndex((i) => mod(i + dir, WALLS.length));
    });
  };

  // Web: ok tuşlarıyla dön, Esc ile odaktan çık.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'ArrowRight') go.current(1);
      if (e.key === 'ArrowLeft') go.current(-1);
      if (e.key === 'Escape' && focusRef.current) dispatch({ type: 'focus/clear' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const pan = useMemo(
    () =>
      PanResponder.create({
        // Zoom'dayken kaydırma kapalı; önce odaktan çıkılmalı.
        onMoveShouldSetPanResponder: (_, g) =>
          !focusRef.current && Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderMove: (_, g) => dragX.setValue(g.dx),
        onPanResponderRelease: (_, g) => {
          if (g.dx < -width * SWIPE_THRESHOLD || g.vx < -0.5) go.current(1);
          else if (g.dx > width * SWIPE_THRESHOLD || g.vx > 0.5) go.current(-1);
          else Animated.spring(dragX, { toValue: 0, useNativeDriver: false }).start();
        },
        onPanResponderTerminate: () => Animated.spring(dragX, { toValue: 0, useNativeDriver: false }).start(),
      }),
    [width],
  );

  return (
    <View style={styles.root}>
      <View style={styles.stage} {...pan.panHandlers}>
        {([-1, 0, 1] as const).map((offset) => {
          const wall = WALLS[mod(index + offset, WALLS.length)];
          const Wall = WALL_COMPONENTS[wall];
          return (
            <Animated.View
              key={wall}
              pointerEvents={offset === 0 ? 'auto' : 'none'}
              style={[StyleSheet.absoluteFill, { transform: [{ translateX: Animated.add(dragX, offset * width) }] }]}
            >
              <Wall />
            </Animated.View>
          );
        })}
      </View>
      <MusicPlayer />
      <ReactionLayer />
      <Hud wall={WALLS[index]} index={index} onPrev={() => go.current(-1)} onNext={() => go.current(1)} />
      {focus && <FocusPanel objectId={focus.objectId} by={focus.by} />}
      <CallOverlay />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#170c1f' },
  stage: { flex: 1, overflow: 'hidden' },
});
