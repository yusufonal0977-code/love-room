import { useState } from 'react';
import { Pressable, View } from 'react-native';
import type { RoomSummary } from '@loveroom/shared';
import { api, errorText } from '../lib/api';
import { parseInvite } from '../lib/inviteLink';
import { useSession } from '../state/session';
import { Backdrop } from '../ui/Backdrop';
import { LogoMark } from '../ui/Logo';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { Body, Title } from '../ui/Txt';
import { colors } from '../theme';

/** "14.02.2023" → "2023-02-14"; boş ya da geçersizse null. */
function parseDate(input: string): string | null | 'invalid' {
  const t = input.trim();
  if (!t) return null;
  const m = t.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (!m) return 'invalid';
  const [, d, mo, y] = m;
  const iso = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime()) || date.getTime() > Date.now() || date.getDate() !== Number(d)) return 'invalid';
  return iso;
}

export function CreateRoomScreen() {
  const user = useSession((s) => s.user)!;
  const token = useSession((s) => s.token);
  const setRoom = useSession((s) => s.setRoom);
  const setPendingInvite = useSession((s) => s.setPendingInvite);
  const signOut = useSession((s) => s.signOut);

  const [name, setName] = useState('Bizim Ev');
  const [date, setDate] = useState('');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    const anniversary = parseDate(date);
    if (anniversary === 'invalid') return setError('Tarihi GG.AA.YYYY şeklinde yaz (örn. 14.02.2023).');
    setBusy(true);
    setError(null);
    try {
      setRoom(await api<RoomSummary>('/rooms', { token, body: { name: name.trim() || 'Bizim Ev', anniversary } }), true);
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };

  const join = () => {
    const code = parseInvite(link);
    if (!code) return setError('Bu bir davet linkine benzemiyor.');
    setPendingInvite(code);
  };

  return (
    <Backdrop>
      <View style={{ alignItems: 'center', gap: 8 }}>
        <LogoMark size={56} />
        <Title size={32} center>
          Hoş geldin, {user.name}
        </Title>
        <Body center color={colors.textDim}>
          Önce ikinize ait küçük bir ev kuralım.
        </Body>
      </View>

      <Card>
        <Field label="Evinizin adı" value={name} onChangeText={setName} maxLength={40} />
        <Field
          label="Birlikteliğiniz ne zaman başladı? (isteğe bağlı)"
          value={date}
          onChangeText={setDate}
          placeholder="GG.AA.YYYY"
          keyboardType="numbers-and-punctuation"
          hint="Arka duvardaki ilişki saati bu günden itibaren sayar."
        />
        <Button label="Evimizi kur ✨" onPress={create} loading={busy} />
      </Card>

      <Card>
        <Field
          label="Partnerin bir davet linki mi gönderdi?"
          value={link}
          onChangeText={setLink}
          placeholder="Linki buraya yapıştır"
          autoCapitalize="none"
        />
        <Button variant="ghost" label="Odasına katıl" onPress={join} disabled={!link.trim()} />
      </Card>

      {error && (
        <Body center color={colors.blush}>
          {error}
        </Body>
      )}
      <Pressable onPress={signOut}>
        <Body center size={13} color={colors.textDim}>
          Farklı hesapla giriş yap
        </Body>
      </Pressable>
    </Backdrop>
  );
}
