import { useEffect } from 'react';
import type { VideoPlayer } from 'expo-video';
import { tvPosition } from '@loveroom/shared';
import { serverNow } from '../../state/room';

/** Kabul edilen sapma: iki cihaz arasında bundan fazla fark olursa konum düzeltilir. */
const MAX_DRIFT_SEC = 1.5;

interface SyncedMedia {
  playing: boolean;
  positionSec: number;
  updatedAt: number;
}

/**
 * Ortak oynatma: oda durumu (playing, positionSec, updatedAt) tek doğruluk kaynağıdır.
 * Her cihaz kendi oynatıcısını bu duruma göre periyodik olarak hizalar. TV ve pikap aynı mantığı kullanır.
 */
export function useMediaSync(player: VideoPlayer, media: SyncedMedia) {
  useEffect(() => {
    const sync = () => {
      const target = tvPosition(media, serverNow());
      if (Math.abs(player.currentTime - target) > MAX_DRIFT_SEC) player.currentTime = target;
      if (media.playing && !player.playing) player.play();
      if (!media.playing && player.playing) player.pause();
    };
    sync();
    const id = setInterval(sync, 2000);
    return () => clearInterval(id);
  }, [player, media.playing, media.positionSec, media.updatedAt]);
}
