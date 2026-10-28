import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  daysTogether,
  FRAME_IDS,
  PET_HUNGRY_AFTER_MS,
  tvPosition,
  type FrameId,
  type ObjectId,
} from '@loveroom/shared';
import { memberName, serverNow, useDispatch, useMe, usePartner, useRoom, useRoomStore } from '../state/room';
import { useSession } from '../state/session';
import { useNow } from '../hooks/useNow';
import { api, errorText } from '../lib/api';
import { Button } from '../ui/Button';
import { Body, Strong, Title } from '../ui/Txt';
import { colors, fonts, webStyle } from '../theme';
import { FOCUS_PANEL_HEIGHT } from './WallCanvas';
import { MusicPanel } from './panels/MusicPanel';
import { QuestionPanel } from './panels/QuestionPanel';

/** Örnek filmler (açık lisanslı Blender filmleri). Kendi .mp4 adresinizi de girebilirsiniz. */
const CATALOG = [
  {
    title: 'Big Buck Bunny',
    url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/c/c0/Big_Buck_Bunny_4K.webm/Big_Buck_Bunny_4K.webm.720p.vp9.webm',
  },
  { title: 'Tears of Steel', url: 'https://download.blender.org/demo/movies/ToS/tears_of_steel_720p.mov' },
  { title: 'Sintel (fragman)', url: 'https://download.blender.org/durian/trailer/sintel_trailer-480p.mp4' },
];

const TITLES: Record<ObjectId, string> = {
  tv: 'Film gecesi',
  pet: 'Ortak kedimiz',
  sofa: 'Kanepemiz',
  clock: 'İlişki saati',
  fireplace: 'Şömine',
  window: 'Pencere',
  'frame-left-1': 'Tablo',
  'frame-left-2': 'Tablo',
  'photo-right-1': 'Polaroid',
  'photo-right-2': 'Polaroid',
  record: 'Pikap',
  jar: 'Soru kavanozu',
};

/** Odaklanan objenin kontrolleri. Zoom'lu sahnenin dışında, ölçeklenmeden alttan açılır. */
export function FocusPanel({ objectId, by }: { objectId: ObjectId; by: string }) {
  const dispatch = useDispatch();
  const byName = useRoomStore((s) => (s.userId === by ? null : memberName(s.room!, by)));

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Title size={22}>{TITLES[objectId]}</Title>
          {byName && (
            <Body size={12} color={colors.blush}>
              {byName} seni buraya çağırdı ✨
            </Body>
          )}
        </View>
        <Pressable onPress={() => dispatch({ type: 'focus/clear' })} style={styles.close} hitSlop={10}>
          <Text style={{ color: colors.text, fontSize: 18 }}>✕</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ gap: 12 }} showsVerticalScrollIndicator={false}>
        {objectId === 'tv' && <TvControls />}
        {objectId === 'pet' && <PetControls />}
        {objectId === 'sofa' && <SofaControls />}
        {objectId === 'clock' && <ClockInfo />}
        {objectId === 'fireplace' && <FireplaceControls />}
        {objectId === 'window' && <WindowInfo />}
        {objectId === 'record' && <MusicPanel />}
        {objectId === 'jar' && <QuestionPanel />}
        {FRAME_IDS.includes(objectId as FrameId) && <FrameControls id={objectId as FrameId} />}
      </ScrollView>
    </View>
  );
}

const Row = ({ children }: { children: ReactNode }) => <View style={styles.row}>{children}</View>;
const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

function TvControls() {
  const tv = useRoom((r) => r.tv);
  const dispatch = useDispatch();
  const now = useNow(tv.playing, 1000);
  const [url, setUrl] = useState('');
  const pos = tvPosition(tv, now);

  if (!tv.on) {
    return (
      <>
        <Body color={colors.textDim}>TV'yi açınca partnerinin ekranı da buraya döner.</Body>
        <Button label="TV'yi aç 📺" onPress={() => dispatch({ type: 'tv/power' })} />
      </>
    );
  }

  return (
    <>
      {tv.mediaUrl && (
        <Row>
          <View style={{ flex: 1 }}>
            <Strong numberOfLines={1}>{tv.mediaTitle}</Strong>
            <Body size={12} color={colors.textDim}>
              {tv.playing ? '▶ Birlikte izliyorsunuz' : '⏸ Duraklatıldı'} · {fmt(pos)}
            </Body>
          </View>
          <Button small variant="ghost" label="−10" onPress={() => dispatch({ type: 'tv/seek', positionSec: pos - 10 })} />
          <Button
            small
            label={tv.playing ? 'Duraklat' : 'Oynat'}
            onPress={() => dispatch({ type: tv.playing ? 'tv/pause' : 'tv/play' })}
          />
          <Button small variant="ghost" label="+10" onPress={() => dispatch({ type: 'tv/seek', positionSec: pos + 10 })} />
        </Row>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {CATALOG.map((m) => (
          <Pressable
            key={m.url}
            onPress={() => dispatch({ type: 'tv/load', mediaUrl: m.url, mediaTitle: m.title })}
            style={[styles.chip, tv.mediaUrl === m.url && styles.chipActive]}
          >
            <Text style={styles.chipText}>🎬 {m.title}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Row>
        <TextInput
          value={url}
          onChangeText={setUrl}
          placeholder="Ya da bir video bağlantısı (.mp4 / .webm)"
          placeholderTextColor="rgba(253,239,243,0.35)"
          autoCapitalize="none"
          style={styles.input}
        />
        <Button
          small
          variant="ghost"
          label="Yükle"
          disabled={!/^https?:\/\//.test(url)}
          onPress={() => {
            dispatch({ type: 'tv/load', mediaUrl: url.trim(), mediaTitle: 'Bizim film' });
            setUrl('');
          }}
        />
      </Row>
      <Pressable onPress={() => dispatch({ type: 'tv/power' })}>
        <Body size={12} color={colors.textDim}>
          TV'yi kapat
        </Body>
      </Pressable>
    </>
  );
}

function PetControls() {
  const pet = useRoom((r) => r.pet);
  const dispatch = useDispatch();
  const now = useNow(true, 30_000);
  const hungry = now - pet.lastFedAt > PET_HUNGRY_AFTER_MS;
  const hours = Math.floor((now - pet.lastFedAt) / 3_600_000);

  return (
    <>
      <Body color={colors.textDim}>
        {hungry
          ? `${pet.name}'nin karnı aç, ikinizi de bekliyor.`
          : `${pet.name} mutlu mutlu mırlıyor. Son mama: ${hours < 1 ? 'az önce' : `${hours} saat önce`}.`}
      </Body>
      <Row>
        <Button style={{ flex: 1 }} label="Besle 🍣" onPress={() => dispatch({ type: 'pet/feed' })} />
        <Button style={{ flex: 1 }} variant="ghost" label="Sev 🤍" onPress={() => dispatch({ type: 'pet/pet' })} />
      </Row>
    </>
  );
}

function SofaControls() {
  const sofa = useRoom((r) => r.sofa);
  const me = useMe();
  const partner = usePartner();
  const dispatch = useDispatch();
  const meSeated = !!me && sofa.includes(me.id);
  const partnerSeated = !!partner && sofa.includes(partner.id);

  return (
    <>
      <Body color={colors.textDim}>
        {meSeated && partnerSeated
          ? 'Yan yanasınız. Mesafeler bir an için yok 💞'
          : partnerSeated
            ? `${partner!.name} kanepede seni bekliyor.`
            : 'Kanepeye otur; partnerin de oturunca yan yana görüneceksiniz.'}
      </Body>
      <Button label={meSeated ? 'Kalk' : 'Kanepeye otur 🛋️'} onPress={() => dispatch({ type: 'sofa/toggle' })} />
    </>
  );
}

function ClockInfo() {
  const anniversary = useRoom((r) => r.anniversary);
  const now = serverNow();
  const days = daysTogether(anniversary, now);
  if (days === null || !anniversary) {
    return <Body color={colors.textDim}>Birlikteliğinizin başladığı günü odayı kurarken eklerseniz saat günleri sayar.</Body>;
  }
  const start = new Date(`${anniversary}T00:00:00`);
  const next = new Date(start);
  next.setFullYear(new Date(now).getFullYear());
  if (next.getTime() < now) next.setFullYear(next.getFullYear() + 1);
  const until = Math.ceil((next.getTime() - now) / 86_400_000);

  return (
    <>
      <Title size={34} color={colors.gold}>
        {days} gün
      </Title>
      <Body color={colors.textDim}>
        {start.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} tarihinden beri birliktesiniz.
        Yıl dönümünüze {until} gün kaldı.
      </Body>
    </>
  );
}

function FireplaceControls() {
  const lit = useRoom((r) => r.fireplaceLit);
  const dispatch = useDispatch();
  return (
    <>
      <Body color={colors.textDim}>{lit ? 'Odun çıtırtısı, sıcak bir ışık…' : 'Şömine soğuk. Biraz ateş iyi gelir.'}</Body>
      <Button label={lit ? 'Ateşi söndür' : 'Ateşi yak 🔥'} variant={lit ? 'ghost' : 'primary'} onPress={() => dispatch({ type: 'fireplace/toggle' })} />
    </>
  );
}

function WindowInfo() {
  const me = useMe();
  const partner = usePartner();
  const now = useNow(true, 30_000);
  const time = (tz: string | null) =>
    new Date(now).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: tz ?? undefined });
  const city = (tz: string | null) => tz?.split('/').pop()?.replace(/_/g, ' ') ?? '—';

  return (
    <Row>
      {[me, partner].map((m, i) =>
        m ? (
          <View key={m.id} style={styles.timeCard}>
            <Body size={12} color={colors.textDim}>
              {i === 0 ? 'Sende' : m.name}
            </Body>
            <Title size={28}>{time(m.timezone)}</Title>
            <Body size={12} color={colors.textDim}>
              {city(m.timezone)}
            </Body>
          </View>
        ) : null,
      )}
      {!partner && <Body color={colors.textDim}>Partnerin katılınca onun saatini de burada göreceksin.</Body>}
    </Row>
  );
}

function FrameControls({ id }: { id: FrameId }) {
  const frame = useRoom((r) => r.frames[id]);
  const dispatch = useDispatch();
  const token = useSession((s) => s.token);
  const [caption, setCaption] = useState(frame.caption ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addedBy = useRoomStore((s) => (frame.by ? memberName(s.room!, frame.by) : null));

  const pick = async () => {
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled) return;
    const asset = result.assets[0];
    setBusy(true);
    try {
      const blob = await (await fetch(asset.uri)).blob();
      const { url } = await api<{ url: string }>('/uploads', {
        token,
        blob,
        contentType: asset.mimeType ?? (blob.type || 'image/jpeg'),
      });
      dispatch({ type: 'frame/set', frameId: id, url, caption: caption.trim() || null });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {addedBy && (
        <Body size={12} color={colors.textDim}>
          Bu anıyı {addedBy} ekledi{frame.caption ? `: “${frame.caption}”` : '.'}
        </Body>
      )}
      <TextInput
        value={caption}
        onChangeText={setCaption}
        placeholder="Altına bir not (isteğe bağlı)"
        placeholderTextColor="rgba(253,239,243,0.35)"
        maxLength={60}
        style={styles.input}
      />
      <Row>
        <Button style={{ flex: 1 }} label={frame.url ? 'Fotoğrafı değiştir' : 'Fotoğraf seç 🖼️'} onPress={pick} loading={busy} />
        {frame.url && (
          <Button variant="ghost" label="Kaldır" onPress={() => dispatch({ type: 'frame/clear', frameId: id })} />
        )}
      </Row>
      {busy && <ActivityIndicator color={colors.rose} />}
      {error && (
        <Body size={12} color={colors.blush}>
          {error}
        </Body>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    maxWidth: 560,
    alignSelf: 'center',
    marginHorizontal: 'auto',
    maxHeight: FOCUS_PANEL_HEIGHT + 40,
    backgroundColor: colors.glassStrong,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 18,
    gap: 12,
    ...webStyle({ backdropFilter: 'blur(16px)' }),
    boxShadow: '0 -10px 40px rgba(0,0,0,0.4)',
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  close: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.glass, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.glass },
  chipActive: { borderColor: colors.rose, backgroundColor: 'rgba(236,122,150,0.2)' },
  chipText: { color: colors.text, fontFamily: fonts.bodySemi, fontSize: 13 },
  input: {
    flex: 1,
    minWidth: 160,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  timeCard: {
    flex: 1,
    minWidth: 120,
    backgroundColor: colors.glass,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
});
