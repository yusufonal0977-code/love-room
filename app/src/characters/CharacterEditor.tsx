import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  ACCESSORIES,
  DEFAULT_CHARACTER,
  HAIR_COLORS,
  HAIR_STYLES,
  OUTFIT_COLORS,
  SKIN_TONES,
  type Character,
  type PublicUser,
} from '@loveroom/shared';
import { api, errorText } from '../lib/api';
import { useSession } from '../state/session';
import { Button } from '../ui/Button';
import { Body, Strong, Title } from '../ui/Txt';
import { colors, fonts } from '../theme';
import { CharacterFigure } from './CharacterFigure';

const HAIR_LABEL: Record<Character['hair'], string> = { short: 'Kısa', long: 'Uzun', bun: 'Topuz', curly: 'Kıvırcık', bob: 'Küt' };
const ACC_LABEL: Record<Character['accessory'], string> = {
  none: 'Yok',
  glasses: 'Gözlük',
  beanie: 'Bere',
  flower: 'Çiçek',
  headphones: 'Kulaklık',
};

/** Odada (kanepede, avatarda) seni temsil eden karakteri oluştur/düzenle. */
export function CharacterEditor({ visible, onClose, firstTime }: { visible: boolean; onClose: () => void; firstTime?: boolean }) {
  const user = useSession((s) => s.user);
  const token = useSession((s) => s.token);
  const [c, setC] = useState<Character>(user?.character ?? DEFAULT_CHARACTER);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<Character>) => setC((prev) => ({ ...prev, ...patch }));

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const updated = await api<PublicUser>('/me/character', { token, body: c });
      useSession.setState({ user: updated });
      onClose();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <ScrollView contentContainerStyle={{ gap: 14 }} showsVerticalScrollIndicator={false}>
            <Title size={24} center>
              {firstTime ? 'Odadaki halini oluştur' : 'Karakterim'}
            </Title>
            {firstTime && (
              <Body center size={13} color={colors.textDim}>
                Kanepede oturan, sarılan, film izleyen sen olacaksın.
              </Body>
            )}
            <View style={styles.preview}>
              <CharacterFigure character={c} />
            </View>

            <Section label="Ten">
              {SKIN_TONES.map((hex, i) => (
                <Swatch key={hex} color={hex} active={c.skin === i} onPress={() => set({ skin: i })} />
              ))}
            </Section>
            <Section label="Saç">
              {HAIR_STYLES.map((h) => (
                <Chip key={h} label={HAIR_LABEL[h]} active={c.hair === h} onPress={() => set({ hair: h })} />
              ))}
            </Section>
            <Section label="Saç rengi">
              {HAIR_COLORS.map((hex, i) => (
                <Swatch key={hex} color={hex} active={c.hairColor === i} onPress={() => set({ hairColor: i })} />
              ))}
            </Section>
            <Section label="Kıyafet">
              {OUTFIT_COLORS.map((hex, i) => (
                <Swatch key={hex} color={hex} active={c.outfit === i} onPress={() => set({ outfit: i })} />
              ))}
            </Section>
            <Section label="Aksesuar">
              {ACCESSORIES.map((a) => (
                <Chip key={a} label={ACC_LABEL[a]} active={c.accessory === a} onPress={() => set({ accessory: a })} />
              ))}
            </Section>

            {error && (
              <Body center size={13} color={colors.blush}>
                {error}
              </Body>
            )}
            <Button label="Kaydet ✨" onPress={save} loading={busy} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Strong size={12} color={colors.textDim}>
        {label}
      </Strong>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>
    </View>
  );
}

function Swatch({ color, active, onPress }: { color: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.swatch, { backgroundColor: color }, active && styles.swatchActive]} />
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(14,9,6,0.6)', justifyContent: 'center', padding: 16 },
  sheet: {
    backgroundColor: colors.sheet,
    borderRadius: 28,
    padding: 22,
    maxWidth: 440,
    maxHeight: '92%',
    width: '100%',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  preview: {
    alignSelf: 'center',
    width: 140,
    height: 190,
    borderRadius: 24,
    backgroundColor: '#efe2cf',
    paddingTop: 8,
    boxShadow: 'inset 0 -20px 30px rgba(180,120,70,0.25)',
  },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: 'transparent' },
  swatchActive: { borderColor: colors.cream, transform: [{ scale: 1.1 }] },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: colors.glass },
  chipActive: { borderColor: colors.rose, backgroundColor: 'rgba(217,120,90,0.25)' },
  chipText: { color: colors.text, fontFamily: fonts.bodySemi, fontSize: 13 },
});
