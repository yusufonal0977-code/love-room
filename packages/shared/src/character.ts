// Kişiye özel karakterler ve ortak evcil hayvanın görünümü.
// Renkler indeks olarak saklanır: doğrulaması kolay, palet değişse de veriler bozulmaz.

export const SKIN_TONES = ['#f7d9c4', '#efc19f', '#d69d76', '#a8714d', '#6e4531'] as const;
export const HAIR_STYLES = ['short', 'long', 'bun', 'curly', 'bob'] as const;
export const HAIR_COLORS = ['#2b1d16', '#5a3825', '#9a5b2e', '#d9a95c', '#b9472f', '#e8e0d4'] as const;
export const OUTFIT_COLORS = ['#c8664a', '#7f9a78', '#5b7fa6', '#e0a940', '#b5838d', '#45414f'] as const;
export const ACCESSORIES = ['none', 'glasses', 'beanie', 'flower', 'headphones'] as const;

export type HairStyle = (typeof HAIR_STYLES)[number];
export type Accessory = (typeof ACCESSORIES)[number];

export interface Character {
  skin: number;
  hair: HairStyle;
  hairColor: number;
  outfit: number;
  accessory: Accessory;
}

export const DEFAULT_CHARACTER: Character = { skin: 1, hair: 'short', hairColor: 1, outfit: 0, accessory: 'none' };

const inRange = (n: unknown, len: number) => Number.isInteger(n) && (n as number) >= 0 && (n as number) < len;

export function isCharacter(x: unknown): x is Character {
  if (!x || typeof x !== 'object') return false;
  const c = x as Record<string, unknown>;
  return (
    inRange(c.skin, SKIN_TONES.length) &&
    HAIR_STYLES.includes(c.hair as HairStyle) &&
    inRange(c.hairColor, HAIR_COLORS.length) &&
    inRange(c.outfit, OUTFIT_COLORS.length) &&
    ACCESSORIES.includes(c.accessory as Accessory)
  );
}

// ---- Ortak evcil hayvan ----

export const PET_SPECIES = ['cat', 'dog', 'bunny'] as const;
export const PET_COLORS = ['#f0b37e', '#a9a4ad', '#3f3638', '#f4eee6', '#9a6a48'] as const;
export const PET_ACCESSORIES = ['collar', 'bow', 'bandana', 'none'] as const;

export type PetSpecies = (typeof PET_SPECIES)[number];
export type PetAccessory = (typeof PET_ACCESSORIES)[number];
