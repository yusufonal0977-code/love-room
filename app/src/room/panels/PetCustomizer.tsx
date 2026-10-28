import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { PET_ACCESSORIES, PET_COLORS, PET_SPECIES, type PetAccessory, type PetSpecies } from '@loveroom/shared';
import { useDispatch, useRoom } from '../../state/room';
import { Button } from '../../ui/Button';
import { Strong } from '../../ui/Txt';
import { colors } from '../../theme';
import { PetFigure } from '../objects/Pet';
import { panel } from './panelStyles';

const SPECIES_LABEL: Record<PetSpecies, string> = { cat: '🐱 Kedi', dog: '🐶 Köpek', bunny: '🐰 Tavşan' };
const ACC_LABEL: Record<PetAccessory, string> = { collar: 'Kalpli tasma', bow: 'Fiyonk', bandana: 'Bandana', none: 'Yok' };

/** Ortak evcil hayvanın türü, rengi, aksesuarı ve adı. Değişiklik iki ekranda da anında görünür. */
export function PetCustomizer() {
  const pet = useRoom((r) => r.pet);
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(pet.name);

  if (!open) {
    return (
      <Pressable onPress={() => setOpen(true)}>
        <Strong size={13} color={colors.gold}>
          🎨 Görünümünü değiştir ▾
        </Strong>
      </Pressable>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: '#efe2cf' }}>
          <PetFigure species={pet.species} fur={PET_COLORS[pet.color]} accessory={pet.accessory} />
        </View>
        <TextInput
          value={name}
          onChangeText={setName}
          maxLength={20}
          placeholder="Adı"
          placeholderTextColor="rgba(251,243,232,0.35)"
          style={panel.input}
        />
        <Button small variant="ghost" label="Kaydet" disabled={!name.trim()} onPress={() => dispatch({ type: 'pet/customize', name })} />
      </View>
      <View style={panel.row}>
        {PET_SPECIES.map((s) => (
          <Pressable key={s} onPress={() => dispatch({ type: 'pet/customize', species: s })} style={[panel.chip, pet.species === s && panel.chipActive]}>
            <Text style={panel.chipText}>{SPECIES_LABEL[s]}</Text>
          </Pressable>
        ))}
      </View>
      <View style={panel.row}>
        {PET_COLORS.map((hex, i) => (
          <Pressable
            key={hex}
            onPress={() => dispatch({ type: 'pet/customize', color: i })}
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: hex,
              borderWidth: 2,
              borderColor: pet.color === i ? colors.cream : 'transparent',
            }}
          />
        ))}
      </View>
      <View style={panel.row}>
        {PET_ACCESSORIES.map((a) => (
          <Pressable key={a} onPress={() => dispatch({ type: 'pet/customize', accessory: a })} style={[panel.chip, pet.accessory === a && panel.chipActive]}>
            <Text style={panel.chipText}>{ACC_LABEL[a]}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
