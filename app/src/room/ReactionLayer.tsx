import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import type { Reaction, ReactionKind } from '@loveroom/shared';
import { memberName, useRoomStore } from '../state/room';
import { colors, fonts } from '../theme';
import { REACTION_EMOJI } from './Hud';

const useNativeDriver = Platform.OS !== 'web';

const PARTNER_TEXT: Record<ReactionKind, string> = {
  heart: 'sana kalp gönderdi',
  hug: 'sana sıkıca sarıldı',
  kiss: 'sana bir öpücük yolladı',
  miss: 'seni çok özledi',
};

/** Tepkiler iki ekranda da aşağıdan yukarı süzülür; partnerden gelirse ortada bir mesaj belirir. */
export function ReactionLayer() {
  const reactions = useRoomStore((s) => s.reactions);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {reactions.map((r) => (
        <ReactionBurst key={r.id} reaction={r} />
      ))}
    </View>
  );
}

function ReactionBurst({ reaction }: { reaction: Reaction }) {
  const drop = useRoomStore((s) => s.dropReaction);
  const fromPartner = useRoomStore((s) => s.userId !== reaction.from);
  const name = useRoomStore((s) => (s.room ? memberName(s.room, reaction.from) : ''));
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 2600, useNativeDriver }).start(() => drop(reaction.id));
  }, []);

  const particles = useRef(
    Array.from({ length: 7 }, (_, i) => ({ x: 15 + ((i * 41 + reaction.at) % 70), rise: 260 + ((i * 67) % 220), size: 22 + ((i * 13) % 18) })),
  ).current;

  return (
    <View style={StyleSheet.absoluteFill}>
      {particles.map((p, i) => (
        <Animated.Text
          key={i}
          style={{
            position: 'absolute',
            bottom: 90,
            left: `${p.x}%`,
            fontSize: p.size,
            opacity: v.interpolate({ inputRange: [0, 0.1, 0.75, 1], outputRange: [0, 1, 1, 0] }),
            transform: [
              { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -p.rise] }) },
              { scale: v.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.4, 1.1, 0.9] }) },
            ],
          }}
        >
          {REACTION_EMOJI[reaction.kind]}
        </Animated.Text>
      ))}
      {fromPartner && (
        <Animated.View
          style={[
            styles.toast,
            {
              opacity: v.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 1, 1, 0] }),
              transform: [{ scale: v.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0.85, 1, 1] }) }],
            },
          ]}
        >
          <Text style={{ fontSize: 40 }}>{REACTION_EMOJI[reaction.kind]}</Text>
          <Text style={styles.toastText}>
            {name} {PARTNER_TEXT[reaction.kind]}
          </Text>
        </Animated.View>
      )}
      {fromPartner && reaction.kind === 'hug' && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.hugGlow,
            { opacity: v.interpolate({ inputRange: [0, 0.15, 0.6, 1], outputRange: [0, 1, 0.6, 0] }) },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: '38%',
    alignSelf: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(42,30,23,0.85)',
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(217,120,90,0.5)',
  },
  toastText: { color: colors.text, fontFamily: fonts.display, fontSize: 20, textAlign: 'center' },
  hugGlow: { boxShadow: 'inset 0 0 160px 60px rgba(217,120,90,0.55)' },
});
