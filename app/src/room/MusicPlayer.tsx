import { StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { MusicState } from '@loveroom/shared';
import { mediaUrl } from '../config';
import { useRoomStore } from '../state/room';
import { useMediaSync } from './objects/useMediaSync';

/**
 * Pikaptaki müzik odanın her duvarında duyulmalı; bu yüzden duvarlardan bağımsız, gezinme
 * katmanında görünmez bir oynatıcı olarak yaşar.
 */
export function MusicPlayer() {
  const music = useRoomStore((s) => s.room!.music);
  if (!music.trackUrl) return null;
  return <Track key={music.trackUrl} music={music} />;
}

function Track({ music }: { music: MusicState }) {
  const player = useVideoPlayer(mediaUrl(music.trackUrl!), (p) => {
    p.loop = true;
    p.volume = 0.7;
  });
  useMediaSync(player, music);
  return (
    <View style={styles.hidden} pointerEvents="none">
      <VideoView player={player} style={{ width: 1, height: 1 }} nativeControls={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' },
});
