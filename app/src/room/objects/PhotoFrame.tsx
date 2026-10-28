import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { FrameId } from '@loveroom/shared';
import { mediaUrl } from '../../config';
import { useRoom } from '../../state/room';
import { colors, fonts } from '../../theme';
import { Focusable } from './Focusable';
import { AspectBox } from './AspectBox';

/**
 * Anı panoları. Sol duvardakiler altın çerçeveli tablo, sağ duvardakiler polaroid.
 * Fotoğraf yükleme odak panelinde yapılır; burada sadece gösterim var.
 */
export function PhotoFrame({ id }: { id: FrameId }) {
  const frame = useRoom((r) => r.frames[id]);
  const polaroid = id.startsWith('photo');
  const tilt = id === 'photo-right-1' ? '-4deg' : id === 'photo-right-2' ? '3deg' : '0deg';

  const photo = frame.url ? (
    <Image source={{ uri: mediaUrl(frame.url) }} style={styles.img} resizeMode="cover" />
  ) : (
    <LinearGradient colors={['#f7e3e8', '#e9cfe0']} style={styles.empty}>
      <Text style={styles.plus}>＋</Text>
      <Text style={styles.emptyText}>Anı ekle</Text>
    </LinearGradient>
  );

  return (
    <Focusable id={id}>
      <AspectBox ratio={polaroid ? 0.82 : 0.8}>
      {polaroid ? (
        <View style={[styles.polaroid, { transform: [{ rotate: tilt }] }]}>
          <View style={styles.tape} />
          <View style={styles.polaroidPhoto}>{photo}</View>
          <Text style={styles.caption} numberOfLines={1}>
            {frame.caption ?? ''}
          </Text>
        </View>
      ) : (
        <LinearGradient colors={['#f7d58a', '#c89038', '#f2cd7c', '#a8742a']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gilt}>
          <View style={styles.mat}>{photo}</View>
        </LinearGradient>
      )}
      </AspectBox>
    </Focusable>
  );
}

const styles = StyleSheet.create({
  img: { width: '100%', height: '100%' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  plus: { fontSize: 18, color: colors.roseDeep, opacity: 0.7 },
  emptyText: { fontSize: 9, color: colors.roseDeep, fontFamily: fonts.bodySemi, opacity: 0.8 },
  gilt: { flex: 1, padding: '7%', borderRadius: 3, boxShadow: '0 8px 18px rgba(0,0,0,0.45)' },
  mat: { flex: 1, backgroundColor: '#fbf3e8', padding: '6%' },
  polaroid: {
    flex: 1,
    backgroundColor: '#fffdf8',
    padding: '7%',
    paddingBottom: 0,
    borderRadius: 2,
    boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
  },
  polaroidPhoto: { flex: 1, overflow: 'hidden', backgroundColor: '#eee' },
  caption: { height: 20, fontFamily: fonts.displayLight, fontSize: 10, color: '#5a3a46', textAlign: 'center', paddingTop: 3 },
  tape: {
    position: 'absolute',
    top: -7,
    alignSelf: 'center',
    width: '40%',
    height: 13,
    backgroundColor: 'rgba(248, 201, 212, 0.75)',
    zIndex: 2,
    transform: [{ rotate: '-3deg' }],
  },
});
