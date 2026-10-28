import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { AlbumPhoto } from '@loveroom/shared';
import { api, errorText } from '../../lib/api';
import { pickAndUploadImage } from '../../lib/upload';
import { mediaUrl } from '../../config';
import { useFeed } from '../../state/feed';
import { useSession } from '../../state/session';
import { memberName, useRoomStore } from '../../state/room';
import { Button } from '../../ui/Button';
import { Body, Strong } from '../../ui/Txt';
import { colors } from '../../theme';
import { panel } from './panelStyles';

/** Ortak fotoğraf albümü: kitaplıktaki albüm. Fotoğraflar sınırsız, en yeni en başta. */
export function AlbumPanel() {
  const photos = useFeed((s) => s.album);
  const loadAlbum = useFeed((s) => s.loadAlbum);
  const token = useSession((s) => s.token);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<AlbumPhoto | null>(null);

  useEffect(() => {
    loadAlbum().catch((e) => setError(errorText(e)));
  }, []);

  const add = async () => {
    setError(null);
    setBusy(true);
    try {
      const url = await pickAndUploadImage(token);
      if (url) {
        await api('/album', { token, body: { url, caption: caption.trim() || null } });
        setCaption('');
        await loadAlbum();
      }
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <View style={panel.row}>
        <TextInput
          value={caption}
          onChangeText={setCaption}
          placeholder="Altına bir not (isteğe bağlı)"
          placeholderTextColor="rgba(251,243,232,0.35)"
          maxLength={140}
          style={panel.input}
        />
        <Button small label="Fotoğraf ekle 📷" onPress={add} loading={busy} />
      </View>
      {error && (
        <Body size={12} color={colors.blush}>
          {error}
        </Body>
      )}
      {photos === null ? (
        <ActivityIndicator color={colors.rose} />
      ) : photos.length === 0 ? (
        <Body color={colors.textDim}>Albüm boş. Birlikte ilk anınızı ekleyin 💞</Body>
      ) : (
        <View style={styles.grid}>
          {photos.map((p) => (
            <Pressable key={p.id} style={styles.thumb} onPress={() => setViewing(p)}>
              <Image source={{ uri: mediaUrl(p.url) }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            </Pressable>
          ))}
        </View>
      )}
      <PhotoViewer photo={viewing} onClose={() => setViewing(null)} />
    </>
  );
}

function PhotoViewer({ photo, onClose }: { photo: AlbumPhoto | null; onClose: () => void }) {
  const token = useSession((s) => s.token);
  const room = useRoomStore((s) => s.room!);
  const loadAlbum = useFeed((s) => s.loadAlbum);
  if (!photo) return null;

  const remove = async () => {
    await api(`/album/${photo.id}/delete`, { token, body: {} });
    onClose();
    await loadAlbum();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <View style={styles.viewer}>
          <Image source={{ uri: mediaUrl(photo.url) }} style={styles.big} resizeMode="contain" />
          {photo.caption && (
            <Text style={styles.caption}>“{photo.caption}”</Text>
          )}
          <Strong size={12} color={colors.textDim} center>
            {memberName(room, photo.authorId)} · {new Date(photo.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Strong>
          <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center' }}>
            <Button small variant="ghost" label="Sil" onPress={() => void remove()} />
            <Button small label="Kapat" onPress={onClose} />
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  thumb: { width: '31.5%', aspectRatio: 1, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.glass },
  scrim: { flex: 1, backgroundColor: 'rgba(14,9,6,0.85)', justifyContent: 'center', padding: 16 },
  viewer: { gap: 12, maxWidth: 640, width: '100%', alignSelf: 'center' },
  big: { width: '100%', aspectRatio: 1, borderRadius: 16 },
  caption: { color: colors.cream, fontSize: 18, textAlign: 'center', fontStyle: 'italic' },
});
