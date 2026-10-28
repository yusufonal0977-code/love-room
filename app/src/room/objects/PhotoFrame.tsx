import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { FrameId } from '@loveroom/shared';
import { mediaUrl } from '../../config';
import { useRoom } from '../../state/room';
import { fonts } from '../../theme';
import { DefaultArt } from '../decor/Artworks';
import { Focusable } from './Focusable';
import { AspectBox } from './AspectBox';

/**
 * Anı panoları. Sol duvardakiler paspartulu ahşap çerçeveli tablo, sağ duvardakiler polaroid.
 * Fotoğraf konmadıysa varsayılan bir resim asılı durur; değiştirmek için objeye dokunulur.
 */
export function PhotoFrame({ id }: { id: FrameId }) {
  const frame = useRoom((r) => r.frames[id]);
  const polaroid = id.startsWith('photo');
  const tilt = id === 'photo-right-1' ? '-3deg' : id === 'photo-right-2' ? '2.5deg' : '0deg';

  const photo = frame.url ? (
    <Image source={{ uri: mediaUrl(frame.url) }} style={styles.img} resizeMode="cover" />
  ) : (
    <DefaultArt id={id} />
  );

  return (
    <Focusable id={id}>
      <AspectBox ratio={polaroid ? 0.82 : 0.78}>
        {polaroid ? (
          <View style={[styles.polaroid, { transform: [{ rotate: tilt }] }]}>
            <View style={styles.pin} />
            <View style={styles.polaroidPhoto}>{photo}</View>
            <Text style={styles.caption} numberOfLines={1}>
              {frame.caption ?? ''}
            </Text>
          </View>
        ) : (
          <View style={styles.hang}>
            <LinearGradient colors={['#8a5a36', '#5e3a20']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.wood}>
              <View style={styles.mat}>
                <View style={styles.inner}>{photo}</View>
              </View>
              {/* Cama vuran ışık */}
              <LinearGradient
                colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.6, y: 0.6 }}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
            </LinearGradient>
          </View>
        )}
      </AspectBox>
    </Focusable>
  );
}

const styles = StyleSheet.create({
  img: { width: '100%', height: '100%' },
  hang: { flex: 1, boxShadow: '4px 10px 16px rgba(40,20,8,0.4)' },
  wood: { flex: 1, padding: '5%', borderRadius: 2 },
  mat: { flex: 1, backgroundColor: '#f8f2e8', padding: '9%', boxShadow: 'inset 1px 2px 3px rgba(0,0,0,0.25)' },
  inner: { flex: 1, overflow: 'hidden', boxShadow: 'inset 0 0 2px rgba(0,0,0,0.4)' },
  polaroid: {
    flex: 1,
    backgroundColor: '#fffdf8',
    padding: '7%',
    paddingBottom: 0,
    borderRadius: 2,
    boxShadow: '3px 8px 14px rgba(40,20,8,0.38)',
  },
  polaroidPhoto: { flex: 1, overflow: 'hidden', backgroundColor: '#eee' },
  caption: { height: 20, fontFamily: fonts.displayLight, fontSize: 10, color: '#5a3a2e', textAlign: 'center', paddingTop: 3 },
  pin: {
    position: 'absolute',
    top: 3,
    alignSelf: 'center',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#c8664a',
    boxShadow: '1px 2px 2px rgba(0,0,0,0.4)',
    zIndex: 2,
  },
});
