import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { tvPosition } from '@loveroom/shared';
import { useDispatch, useRoom } from '../../state/room';
import { useNow } from '../../hooks/useNow';
import { Button } from '../../ui/Button';
import { Body, Strong } from '../../ui/Txt';
import { colors } from '../../theme';
import { panel } from './panelStyles';

/** Kevin MacLeod (incompetech.com) — CC BY 4.0. Uygulamada atıf gösterilir. */
const TRACKS = [
  { title: 'Dreamer', url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Dreamer.mp3' },
  { title: 'Wallpaper', url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Wallpaper.mp3' },
  { title: 'Carefree', url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Carefree.mp3' },
  { title: 'Lobby Time', url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Lobby%20Time.mp3' },
];

const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

export function MusicPanel() {
  const music = useRoom((r) => r.music);
  const dispatch = useDispatch();
  const now = useNow(music.playing, 1000);
  const [url, setUrl] = useState('');

  return (
    <>
      {music.trackUrl ? (
        <View style={panel.row}>
          <View style={{ flex: 1 }}>
            <Strong numberOfLines={1}>♪ {music.trackTitle}</Strong>
            <Body size={12} color={colors.textDim}>
              {music.playing ? 'İkinizde de çalıyor' : 'Duraklatıldı'} · {fmt(tvPosition(music, now))}
            </Body>
          </View>
          <Button
            small
            label={music.playing ? 'Duraklat' : 'Çal'}
            onPress={() => dispatch({ type: music.playing ? 'music/pause' : 'music/play' })}
          />
        </View>
      ) : (
        <Body color={colors.textDim}>Bir plak seç; aynı şarkı ikinizin odasında da aynı anda çalar.</Body>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {TRACKS.map((t) => (
          <Pressable
            key={t.url}
            onPress={() => dispatch({ type: 'music/load', trackUrl: t.url, trackTitle: t.title })}
            style={[panel.chip, music.trackUrl === t.url && panel.chipActive]}
          >
            <Text style={panel.chipText}>💿 {t.title}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={panel.row}>
        <TextInput
          value={url}
          onChangeText={setUrl}
          placeholder="Ya da bir .mp3 bağlantısı yapıştır"
          placeholderTextColor="rgba(253,239,243,0.35)"
          autoCapitalize="none"
          style={panel.input}
        />
        <Button
          small
          variant="ghost"
          label="Çal"
          disabled={!/^https?:\/\//.test(url)}
          onPress={() => {
            dispatch({ type: 'music/load', trackUrl: url.trim(), trackTitle: 'Bizim şarkımız' });
            setUrl('');
          }}
        />
      </View>
      <Body size={11} color={colors.textDim}>
        Müzik: Kevin MacLeod (incompetech.com) · CC BY 4.0
      </Body>
    </>
  );
}
