import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import type { InvitePreview, RoomSummary } from '@loveroom/shared';
import { api, errorText } from '../lib/api';
import { useSession } from '../state/session';
import { Backdrop } from '../ui/Backdrop';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Body, Title } from '../ui/Txt';
import { colors } from '../theme';

export function InviteAcceptScreen({ code }: { code: string }) {
  const token = useSession((s) => s.token);
  const user = useSession((s) => s.user)!;
  const currentRoom = useSession((s) => s.room);
  const setRoom = useSession((s) => s.setRoom);
  const setPendingInvite = useSession((s) => s.setPendingInvite);

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<InvitePreview>(`/invites/${code}`).then(setPreview, (e) => setError(errorText(e)));
  }, [code]);

  const accept = async () => {
    setBusy(true);
    setError(null);
    try {
      const room = await api<RoomSummary>(`/invites/${code}/accept`, { token, body: {} });
      setRoom(room);
      setPendingInvite(null);
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };

  const alreadyHere = currentRoom && preview && currentRoom.name === preview.roomName && currentRoom.memberCount === 2;

  return (
    <Backdrop>
      {!preview && !error && <ActivityIndicator color={colors.rose} />}
      {preview && (
        <View style={{ alignItems: 'center', gap: 14 }}>
          <Avatar name={preview.inviter.name} url={preview.inviter.avatarUrl} size={88} ring={colors.gold} />
          <Title size={30} center>
            {preview.inviter.name} seni odasına davet ediyor
          </Title>
          <Body center color={colors.textDim}>
            “{preview.roomName}” — ikinize ait, şöminesi yanan küçük bir ev.
          </Body>
        </View>
      )}
      {preview && (
        <Card>
          {preview.full && !alreadyHere ? (
            <Body center>Bu odada zaten iki kişi var. 💔</Body>
          ) : (
            <>
              <Body center color={colors.textDim}>
                {user.name} olarak katılacaksın.
                {currentRoom && currentRoom.memberCount === 1 ? ' Kurduğun boş oda kaldırılacak.' : ''}
              </Body>
              <Button label="Odaya katıl 💞" onPress={accept} loading={busy} />
            </>
          )}
        </Card>
      )}
      {error && (
        <Body center color={colors.blush}>
          {error}
        </Body>
      )}
      <Pressable onPress={() => setPendingInvite(null)}>
        <Body center size={13} color={colors.textDim}>
          Vazgeç
        </Body>
      </Pressable>
    </Backdrop>
  );
}
