import * as ImagePicker from 'expo-image-picker';
import { api } from './api';

/** Galeriden bir fotoğraf seçtirir ve sunucuya yükler. Seçim iptal edilirse null döner. */
export async function pickAndUploadImage(token: string | null): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const blob = await (await fetch(asset.uri)).blob();
  const { url } = await api<{ url: string }>('/uploads', {
    token,
    blob,
    contentType: asset.mimeType ?? (blob.type || 'image/jpeg'),
  });
  return url;
}
