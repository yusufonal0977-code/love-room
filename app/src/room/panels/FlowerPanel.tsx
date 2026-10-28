import { Pressable, Text, View } from 'react-native';
import {
  FLOWER_KINDS,
  FLOWER_STAGES,
  WATER_COOLDOWN_MS,
  flowerStage,
  flowerWilted,
  type FlowerKind,
} from '@loveroom/shared';
import { useDispatch, useMe, useRoom, useRoomStore } from '../../state/room';
import { useNow } from '../../hooks/useNow';
import { Button } from '../../ui/Button';
import { Body, Strong } from '../../ui/Txt';
import { colors } from '../../theme';
import { panel } from './panelStyles';

const KIND_LABEL: Record<FlowerKind, string> = { tulip: '🌷 Lale', rose: '🌹 Gül', sunflower: '🌻 Ayçiçeği', daisy: '🌼 Papatya' };
const STAGE_LABEL = ['Tohum', 'Filiz', 'Fide', 'Tomurcuk', 'Çiçek', 'Tam açtı'];

const ago = (ms: number) => {
  const h = Math.floor(ms / 3_600_000);
  return h < 1 ? 'az önce' : h < 24 ? `${h} saat önce` : `${Math.floor(h / 24)} gün önce`;
};

/**
 * Birlikte büyütülen çiçek. Herkes günde bir kez sular; ikiniz de 24 saat içinde sularsanız
 * çiçek iki kat büyür. Uzun süre sulanmazsa boynunu büker ama ölmez.
 */
export function FlowerPanel() {
  const flower = useRoom((r) => r.flower);
  const members = useRoom((r) => r.members);
  const me = useMe();
  const dispatch = useDispatch();
  const now = useNow(true, 30_000);
  const userId = useRoomStore((s) => s.userId);

  const stage = flowerStage(flower.growth);
  const wilted = flowerWilted(flower, now);
  const next = FLOWER_STAGES[stage + 1];
  const prev = FLOWER_STAGES[stage];
  const progress = next ? (flower.growth - prev) / (next - prev) : 1;
  const myLast = userId ? flower.lastWatered[userId] ?? 0 : 0;
  const waitMs = WATER_COOLDOWN_MS - (now - myLast);
  const bloomed = flower.bloomedAt !== null;

  return (
    <>
      <Strong>
        {KIND_LABEL[flower.kind]} · {STAGE_LABEL[stage]}
        {wilted ? ' · susadı 🥀' : ''}
      </Strong>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.glass, overflow: 'hidden' }}>
        <View style={{ width: `${Math.round(progress * 100)}%`, height: '100%', backgroundColor: colors.sage }} />
      </View>
      <Body size={13} color={colors.textDim}>
        {bloomed
          ? 'Birlikte büyüttünüz! 🎉 İsterseniz yeni bir tohum ekleyin.'
          : 'Her biriniz günde bir kez sulayabilir. İkiniz de 24 saat içinde sularsanız iki kat büyür.'}
      </Body>
      <View style={{ gap: 2 }}>
        {members.map((m) => (
          <Body key={m.id} size={12} color={colors.textDim}>
            💧 {m.id === me?.id ? 'Sen' : m.name}: {flower.lastWatered[m.id] ? ago(now - flower.lastWatered[m.id]) : 'henüz sulamadı'}
          </Body>
        ))}
      </View>
      {!bloomed && (
        <Button
          label={waitMs > 0 ? `${Math.ceil(waitMs / 3_600_000)} saat sonra tekrar sulayabilirsin` : 'Sula 💧'}
          disabled={waitMs > 0}
          onPress={() => dispatch({ type: 'flower/water' })}
        />
      )}
      {(bloomed || flower.growth === 0) && (
        <>
          <Body size={12} color={colors.textDim}>
            {bloomed ? 'Yeni tohum:' : 'Tohum türünü seç:'}
          </Body>
          <View style={panel.row}>
            {FLOWER_KINDS.map((k) => (
              <Pressable key={k} onPress={() => dispatch({ type: 'flower/plant', kind: k })} style={[panel.chip, flower.kind === k && !bloomed && panel.chipActive]}>
                <Text style={panel.chipText}>{KIND_LABEL[k]}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </>
  );
}
