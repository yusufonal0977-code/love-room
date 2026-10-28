import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { DIARY_MOODS } from '@loveroom/shared';
import { api, errorText } from '../../lib/api';
import { useFeed } from '../../state/feed';
import { useSession } from '../../state/session';
import { memberName, useRoomStore } from '../../state/room';
import { Button } from '../../ui/Button';
import { Body, Strong } from '../../ui/Txt';
import { colors } from '../../theme';
import { panel } from './panelStyles';

const dateText = (t: number) =>
  new Date(t).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Ortak günlük: ikiniz de yazarsınız, ikiniz de okursunuz. En yeni yazı en üstte. */
export function DiaryPanel() {
  const entries = useFeed((s) => s.diary);
  const loadDiary = useFeed((s) => s.loadDiary);
  const token = useSession((s) => s.token);
  const room = useRoomStore((s) => s.room!);
  const [text, setText] = useState('');
  const [mood, setMood] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDiary().catch((e) => setError(errorText(e)));
  }, []);

  const write = async () => {
    setBusy(true);
    setError(null);
    try {
      await api('/diary', { token, body: { text, mood } });
      setText('');
      setMood(null);
      await loadDiary();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <View style={panel.row}>
        {DIARY_MOODS.map((m) => (
          <Pressable key={m} onPress={() => setMood(mood === m ? null : m)} style={[panel.chip, mood === m && panel.chipActive]}>
            <Text style={{ fontSize: 16 }}>{m}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Bugün aklından ne geçti?"
        placeholderTextColor="rgba(251,243,232,0.35)"
        multiline
        maxLength={2000}
        style={[panel.input, { minHeight: 80, textAlignVertical: 'top' }]}
      />
      <Button label="Günlüğe yaz ✍️" onPress={write} loading={busy} disabled={!text.trim()} />
      {error && (
        <Body size={12} color={colors.blush}>
          {error}
        </Body>
      )}

      {entries === null ? (
        <ActivityIndicator color={colors.rose} />
      ) : entries.length === 0 ? (
        <Body color={colors.textDim}>İlk sayfayı siz yazın. Bir gün dönüp okuduğunuzda çok güzel olacak.</Body>
      ) : (
        entries.map((e) => (
          <View key={e.id} style={panel.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Strong size={12} color={colors.blush}>
                {e.mood ? `${e.mood} ` : ''}
                {memberName(room, e.authorId)}
              </Strong>
              <Body size={11} color={colors.textDim}>
                {dateText(e.createdAt)}
              </Body>
            </View>
            <Body>{e.text}</Body>
          </View>
        ))
      )}
    </>
  );
}
