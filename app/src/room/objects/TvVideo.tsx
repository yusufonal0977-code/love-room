import { useVideoPlayer, VideoView } from 'expo-video';
import type { TvState } from '@loveroom/shared';
import { mediaUrl } from '../../config';
import { useMediaSync } from './useMediaSync';

/** TV ekranındaki ortak video; konum/oynatma `useMediaSync` ile iki cihazda hizalanır. */
export function TvVideo({ tv }: { tv: TvState }) {
  const player = useVideoPlayer(mediaUrl(tv.mediaUrl!), (p) => {
    p.loop = false;
  });
  useMediaSync(player, tv);
  return <VideoView player={player} style={{ flex: 1 }} contentFit="contain" nativeControls={false} />;
}
