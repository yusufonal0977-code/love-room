import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { daysTogether, REACTIONS, WALLS, type ReactionKind, type WallId } from '@loveroom/shared';
import { useMe, usePartner, useRoomStore } from '../state/room';
import { useSession } from '../state/session';
import { Avatar } from '../ui/Avatar';
import { Body, Strong, Title } from '../ui/Txt';
import { Button } from '../ui/Button';
import { InviteCard } from '../screens/InviteCard';
import { colors, fonts, wallThemes } from '../theme';
import { callSupported, startCall, useCall } from '../call/callStore';

export const REACTION_EMOJI: Record<ReactionKind, string> = { heart: '❤️', hug: '🤗', kiss: '💋', miss: '🥺' };

interface Props {
  wall: WallId;
  index: number;
  onPrev: () => void;
  onNext: () => void;
}

/** Üst bar (oda adı, partner) ve alt bar (tepkiler, duvar gezinme). */
export function Hud({ wall, index, onPrev, onNext }: Props) {
  const roomName = useRoomStore((s) => s.room!.name);
  const anniversary = useRoomStore((s) => s.room!.anniversary);
  const online = useRoomStore((s) => s.room!.online);
  const status = useRoomStore((s) => s.status);
  const focused = useRoomStore((s) => !!s.room?.focus);
  const react = useRoomStore((s) => s.react);
  const partner = usePartner();
  const partnerOnline = !!partner && online.includes(partner.id);
  const callStatus = useCall((s) => s.status);
  const [menu, setMenu] = useState(false);
  const days = daysTogether(anniversary, Date.now());

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <LinearGradient colors={['rgba(23,12,31,0.85)', 'rgba(23,12,31,0)']} style={styles.top} pointerEvents="box-none">
        <View style={{ flex: 1 }}>
          <Title size={22} numberOfLines={1}>
            {roomName}
          </Title>
          <Body size={12} color={colors.textDim}>
            {status !== 'online' ? '⚠️ Bağlantı yeniden kuruluyor…' : days !== null ? `${days}. günümüz 💞` : wallThemes[wall].label}
          </Body>
        </View>
        {partner && callSupported() && callStatus === 'idle' && (
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <CallButton icon="📞" online={partnerOnline} name={partner.name} onPress={() => void startCall('audio')} />
            <CallButton icon="🎥" online={partnerOnline} name={partner.name} onPress={() => void startCall('video')} />
          </View>
        )}
        <Pressable onPress={() => setMenu(true)} style={styles.partner}>
          {partner ? (
            <>
              <Body size={13} style={{ fontFamily: fonts.bodySemi }}>
                {partner.name}
              </Body>
              <Avatar name={partner.name} url={partner.avatarUrl} size={34} online={online.includes(partner.id)} />
            </>
          ) : (
            <Body size={13} style={{ fontFamily: fonts.bodyBold }} color={colors.blush}>
              Partnerini davet et 💌
            </Body>
          )}
        </Pressable>
      </LinearGradient>

      {!focused && (
        <View style={styles.reactions}>
          {REACTIONS.map((k) => (
            <Pressable key={k} onPress={() => react(k)} style={({ pressed }) => [styles.reaction, pressed && { transform: [{ scale: 1.25 }] }]}>
              <Text style={{ fontSize: 22 }}>{REACTION_EMOJI[k]}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {!focused && (
        <View style={styles.bottom} pointerEvents="box-none">
          <View style={styles.nav}>
            <Pressable onPress={onPrev} hitSlop={14} style={styles.arrowBtn}>
              <Text style={styles.arrow}>‹</Text>
            </Pressable>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Strong size={14}>{wallThemes[wall].label}</Strong>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {WALLS.map((w, i) => (
                  <View key={w} style={[styles.dot, i === index && styles.dotActive]} />
                ))}
              </View>
            </View>
            <Pressable onPress={onNext} hitSlop={14} style={styles.arrowBtn}>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
          </View>
        </View>
      )}

      <RoomMenu visible={menu} onClose={() => setMenu(false)} />
    </View>
  );
}

function CallButton({ icon, online, name, onPress }: { icon: string; online: boolean; name: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => (online ? onPress() : useCall.setState({ notice: `${name} şu an çevrimdışı.` }))}
      style={({ pressed }) => [styles.callBtn, !online && { opacity: 0.45 }, pressed && { transform: [{ scale: 0.92 }] }]}
    >
      <Text style={{ fontSize: 16 }}>{icon}</Text>
    </Pressable>
  );
}

function RoomMenu({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const me = useMe();
  const partner = usePartner();
  const room = useSession((s) => s.room);
  const signOut = useSession((s) => s.signOut);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: -8 }}>
            {me && <Avatar name={me.name} url={me.avatarUrl} size={52} ring={colors.gold} />}
            <Text style={{ fontSize: 22, marginHorizontal: 6 }}>💞</Text>
            {partner ? (
              <Avatar name={partner.name} url={partner.avatarUrl} size={52} ring={colors.gold} />
            ) : (
              <View style={styles.emptyAvatar}>
                <Text style={{ color: colors.textDim, fontSize: 22 }}>?</Text>
              </View>
            )}
          </View>
          {partner ? (
            <Body center color={colors.textDim}>
              {me?.name} & {partner.name}
            </Body>
          ) : (
            <>
              <Body center color={colors.textDim}>
                Odanda henüz yalnızsın. Bu linki partnerine gönder:
              </Body>
              {room && <InviteCard code={room.inviteCode} />}
            </>
          )}
          <Button variant="ghost" label="Çıkış yap" onPress={signOut} small />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 28 },
  partner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 4,
    minHeight: 42,
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.line,
  },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, gap: 10, alignItems: 'center' },
  reactions: {
    position: 'absolute',
    right: 12,
    top: '48%',
    gap: 6,
    backgroundColor: colors.glassStrong,
    borderRadius: 999,
    padding: 6,
    borderWidth: 1,
    borderColor: colors.line,
  },
  reaction: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    maxWidth: 480,
    width: '100%',
    marginHorizontal: 'auto',
    backgroundColor: colors.glassStrong,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  arrowBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  arrow: { color: colors.text, fontSize: 30, lineHeight: 32 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { backgroundColor: colors.rose, width: 16 },
  scrim: { flex: 1, backgroundColor: 'rgba(10,4,14,0.6)', justifyContent: 'center', padding: 20 },
  sheet: {
    backgroundColor: '#24122e',
    borderRadius: 28,
    padding: 24,
    gap: 16,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  emptyAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.textDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
