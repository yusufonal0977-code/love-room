import { View } from 'react-native';
import { useSession } from '../state/session';
import { Backdrop } from '../ui/Backdrop';
import { LogoMark } from '../ui/Logo';
import { Body, Title } from '../ui/Txt';
import { Button } from '../ui/Button';
import { InviteCard } from './InviteCard';
import { colors } from '../theme';

/** Oda kurulduktan hemen sonra: davet linkini paylaş, sonra odaya gir. */
export function InviteShareScreen() {
  const room = useSession((s) => s.room)!;
  const dismiss = useSession((s) => s.dismissInviteShare);

  return (
    <Backdrop>
      <View style={{ alignItems: 'center', gap: 8 }}>
        <LogoMark size={56} />
        <Title size={32} center>
          {room.name} hazır 🔑
        </Title>
        <Body center color={colors.textDim}>
          Kapıyı aralık bıraktık. Bu linki partnerine gönder; açtığında aynı odada olacaksınız.
        </Body>
      </View>
      <InviteCard code={room.inviteCode} />
      <Button label="Odaya gir" onPress={dismiss} />
    </Backdrop>
  );
}
