import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePartner, useRoomStore } from '../state/room';
import { useNow } from '../hooks/useNow';
import { Avatar } from '../ui/Avatar';
import { Body, Strong, Title } from '../ui/Txt';
import { Button } from '../ui/Button';
import { colors, fonts } from '../theme';
import { MediaView } from './MediaView';
import { acceptCall, declineCall, endCall, hangUp, toggleCam, toggleMic, useCall } from './callStore';

const useNativeDriver = Platform.OS !== 'web';

/**
 * Arama arayüzü odanın üstünde süzülür: gelen arama kartı, "aranıyor" kartı ve görüşme sırasında
 * köşede küçük bir pencere. Oda görünür kalır — konuşurken aynı odada olma hissi korunur.
 */
export function CallOverlay() {
  const status = useCall((s) => s.status);
  const notice = useCall((s) => s.notice);
  const partner = usePartner();
  const partnerOnline = useRoomStore((s) => !!partner && !!s.room?.online.includes(partner.id));

  // Partner bağlantısı koparsa aramayı kapat.
  useEffect(() => {
    if (status !== 'idle' && status !== 'outgoing' && !partnerOnline) endCall('Bağlantı koptu.');
  }, [status, partnerOnline]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {status === 'incoming' && <IncomingCall />}
      {status === 'outgoing' && <OutgoingCall />}
      {(status === 'connecting' || status === 'active') && <CallWindow />}
      {notice && (
        <View style={styles.notice} pointerEvents="none">
          <Body size={14}>{notice}</Body>
        </View>
      )}
    </View>
  );
}

function Pulse({ children }: { children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1400, useNativeDriver }));
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[
          styles.pulse,
          {
            opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
            transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] }) }],
          },
        ]}
      />
      {children}
    </View>
  );
}

function IncomingCall() {
  const kind = useCall((s) => s.kind);
  const partner = usePartner();
  return (
    <View style={styles.scrim}>
      <View style={styles.card}>
        <Pulse>
          <Avatar name={partner?.name ?? '?'} url={partner?.avatarUrl} size={84} ring={colors.gold} />
        </Pulse>
        <Title size={26} center>
          {partner?.name} seni arıyor
        </Title>
        <Body center color={colors.textDim}>
          {kind === 'video' ? '🎥 Görüntülü arama' : '📞 Sesli arama'}
        </Body>
        <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
          <Button style={{ flex: 1 }} variant="ghost" label="Reddet" onPress={declineCall} />
          <Button style={{ flex: 1 }} label="Aç 💞" onPress={() => void acceptCall()} />
        </View>
      </View>
    </View>
  );
}

function OutgoingCall() {
  const kind = useCall((s) => s.kind);
  const partner = usePartner();
  return (
    <View style={styles.outgoing}>
      <Pulse>
        <Avatar name={partner?.name ?? '?'} url={partner?.avatarUrl} size={40} />
      </Pulse>
      <View style={{ flex: 1 }}>
        <Strong size={14}>{partner?.name} aranıyor…</Strong>
        <Body size={12} color={colors.textDim}>
          {kind === 'video' ? 'Görüntülü' : 'Sesli'} arama
        </Body>
      </View>
      <RoundButton label="✕" danger onPress={hangUp} />
    </View>
  );
}

function CallWindow() {
  const { status, kind, local, remote, micOn, camOn, startedAt } = useCall();
  const partner = usePartner();
  const [big, setBig] = useState(false);
  const now = useNow(status === 'active', 1000);
  const secs = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
  const timer = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  const video = kind === 'video';

  return (
    <View style={[styles.window, big && styles.windowBig]}>
      <Pressable style={styles.stage} onPress={() => setBig((b) => !b)}>
        {video ? (
          <MediaView stream={remote} />
        ) : (
          <View style={styles.audioStage}>
            <Pulse>
              <Avatar name={partner?.name ?? '?'} url={partner?.avatarUrl} size={big ? 96 : 56} ring={colors.gold} />
            </Pulse>
            <MediaView stream={remote} hidden />
          </View>
        )}
        {video && local && (
          <View style={styles.self}>
            <MediaView stream={local} muted mirror />
          </View>
        )}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{status === 'active' ? `● ${timer}` : 'Bağlanıyor…'}</Text>
        </View>
      </Pressable>
      <View style={styles.controls}>
        <RoundButton label={micOn ? '🎙️' : '🔇'} onPress={toggleMic} />
        {video && <RoundButton label={camOn ? '📷' : '🚫'} onPress={toggleCam} />}
        <RoundButton label="✕" danger onPress={hangUp} />
      </View>
    </View>
  );
}

function RoundButton({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.round, danger && { backgroundColor: '#d9455f' }]} hitSlop={6}>
      <Text style={{ fontSize: 15, color: '#fff' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,4,14,0.55)', justifyContent: 'center', padding: 20 },
  card: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#24122e',
    borderRadius: 28,
    padding: 26,
    borderWidth: 1,
    borderColor: 'rgba(236,122,150,0.45)',
  },
  pulse: { position: 'absolute', width: '100%', height: '100%', borderRadius: 999, backgroundColor: colors.rose },
  outgoing: {
    position: 'absolute',
    top: 78,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: 300,
    maxWidth: '92%',
    backgroundColor: colors.glassStrong,
    borderRadius: 999,
    paddingVertical: 8,
    paddingLeft: 10,
    paddingRight: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  window: {
    position: 'absolute',
    top: 78,
    right: 12,
    width: 150,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#120a16',
    borderWidth: 1,
    borderColor: 'rgba(236,122,150,0.5)',
    boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
    zIndex: 20,
  },
  windowBig: { left: 12, width: undefined, maxWidth: 560, marginLeft: 'auto' },
  stage: { aspectRatio: 3 / 4, width: '100%' },
  audioStage: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2a1533' },
  self: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: '32%',
    aspectRatio: 3 / 4,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  badge: { position: 'absolute', top: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { color: '#fff', fontSize: 11, fontFamily: fonts.bodySemi },
  controls: { flexDirection: 'row', justifyContent: 'center', gap: 8, padding: 8, backgroundColor: 'rgba(30,14,38,0.95)' },
  round: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  notice: {
    position: 'absolute',
    top: 82,
    alignSelf: 'center',
    backgroundColor: colors.glassStrong,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
});
