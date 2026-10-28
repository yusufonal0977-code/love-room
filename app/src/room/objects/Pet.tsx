import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, RadialGradient, Defs, Stop } from 'react-native-svg';
import { PET_COLORS, PET_HUNGRY_AFTER_MS, type PetAccessory, type PetSpecies } from '@loveroom/shared';
import { useRoom } from '../../state/room';
import { useNow } from '../../hooks/useNow';
import { colors, fonts } from '../../theme';
import { useUid } from '../decor/useUid';
import { Focusable } from './Focusable';

const useNativeDriver = Platform.OS !== 'web';

/** Rengi koyulaştırır/açar (amt: -1..1). */
function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)));
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** Ortak evcil hayvan: durumu sunucuda; biri sevince diğer ekranda da kalpler uçar. */
export function Pet() {
  const pet = useRoom((r) => r.pet);
  const now = useNow(true, 1000);
  const hungry = now - pet.lastFedAt > PET_HUNGRY_AFTER_MS;
  const justPetted = now - pet.lastPettedAt < 2500;

  const breathe = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1800, useNativeDriver }),
        Animated.timing(breathe, { toValue: 0, duration: 1800, useNativeDriver }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // Ara sıra göz kırpma.
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    const id = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 160);
    }, 3800);
    return () => clearInterval(id);
  }, []);

  const scaleY = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });

  return (
    <Focusable id="pet">
      <View style={styles.root}>
        {justPetted && <FloatingHearts key={pet.lastPettedAt} />}
        {hungry && (
          <View style={styles.bubble}>
            <Text style={{ fontSize: 11 }}>🍣?</Text>
          </View>
        )}
        <Animated.View style={[styles.body, { transform: [{ scaleY }] }]}>
          <PetFigure
            species={pet.species}
            fur={PET_COLORS[pet.color] ?? PET_COLORS[0]}
            accessory={pet.accessory}
            eyes={blink ? 'closed' : hungry ? 'sad' : justPetted ? 'happy' : 'open'}
          />
        </Animated.View>
        <View style={styles.tag}>
          <Text style={styles.name}>{pet.name}</Text>
        </View>
      </View>
    </Focusable>
  );
}

type Eyes = 'open' | 'closed' | 'sad' | 'happy';

/** Oturan evcil hayvan: kedi, köpek ya da tavşan; renk ve aksesuar değişebilir. Panelde önizleme olarak da kullanılır. */
export function PetFigure({ species, fur, accessory, eyes = 'open' }: { species: PetSpecies; fur: string; accessory: PetAccessory; eyes?: Eyes }) {
  const id = useUid('pet');
  const dark = shade(fur, -0.22);
  const light = fur === PET_COLORS[3] ? '#ffffff' : shade(fur, 0.65);
  const inner = '#f3a9a0';

  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={`${id}-fur`} cx="40%" cy="35%" r="70%">
          <Stop offset="0" stopColor={shade(fur, 0.15)} />
          <Stop offset="1" stopColor={dark} />
        </RadialGradient>
        <RadialGradient id={`${id}-cs`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#1a0d05" stopOpacity={0.45} />
          <Stop offset="1" stopColor="#1a0d05" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx="50" cy="95" rx="32" ry="5" fill={`url(#${id}-cs)`} />

      {/* Kuyruk */}
      {species === 'cat' && <Path d="M70 86 C92 86 94 64 84 58 C80 56 78 60 82 63 C88 68 84 80 68 80 Z" fill={dark} />}
      {species === 'dog' && <Path d="M70 84 Q88 80 86 66" stroke={dark} strokeWidth="6" fill="none" strokeLinecap="round" />}
      {species === 'bunny' && <Circle cx="74" cy="84" r="7" fill={light} />}

      {/* Gövde, göğüs, patiler */}
      <Ellipse cx="50" cy="72" rx="24" ry="22" fill={`url(#${id}-fur)`} />
      <Ellipse cx="50" cy="76" rx="12" ry="15" fill={light} />
      <Ellipse cx="40" cy="92" rx="7" ry="4.5" fill={light} />
      <Ellipse cx="60" cy="92" rx="7" ry="4.5" fill={light} />

      {/* Kulaklar */}
      {species === 'cat' && (
        <G>
          <Path d="M31 32 L34 11 L48 25 Z" fill={fur} />
          <Path d="M69 32 L66 11 L52 25 Z" fill={fur} />
          <Path d="M34 28 L36 16 L44 25 Z" fill={inner} />
          <Path d="M66 28 L64 16 L56 25 Z" fill={inner} />
        </G>
      )}
      {species === 'bunny' && (
        <G>
          <Ellipse cx="40" cy="12" rx="6" ry="17" fill={fur} transform="rotate(-10 40 22)" />
          <Ellipse cx="60" cy="12" rx="6" ry="17" fill={fur} transform="rotate(10 60 22)" />
          <Ellipse cx="40" cy="13" rx="3" ry="12" fill={inner} transform="rotate(-10 40 22)" />
          <Ellipse cx="60" cy="13" rx="3" ry="12" fill={inner} transform="rotate(10 60 22)" />
        </G>
      )}

      {/* Kafa */}
      <Circle cx="50" cy="40" r="21" fill={`url(#${id}-fur)`} />
      {species === 'dog' && (
        <G>
          <Ellipse cx="30" cy="40" rx="7" ry="15" fill={dark} transform="rotate(15 30 30)" />
          <Ellipse cx="70" cy="40" rx="7" ry="15" fill={dark} transform="rotate(-15 70 30)" />
          <Ellipse cx="50" cy="49" rx="10" ry="7.5" fill={light} />
        </G>
      )}
      {species === 'cat' && (
        <G stroke={dark} strokeWidth="2" strokeLinecap="round">
          <Path d="M50 20 L50 27" />
          <Path d="M44 21 L45 27" />
          <Path d="M56 21 L55 27" />
        </G>
      )}

      {/* Gözler */}
      {eyes === 'open' && (
        <G>
          <Ellipse cx="42" cy="40" rx="3.6" ry="4.4" fill="#2b1a16" />
          <Ellipse cx="58" cy="40" rx="3.6" ry="4.4" fill="#2b1a16" />
          <Circle cx="43.2" cy="38.6" r="1.3" fill="#fff" />
          <Circle cx="59.2" cy="38.6" r="1.3" fill="#fff" />
        </G>
      )}
      {eyes === 'closed' && (
        <G stroke="#2b1a16" strokeWidth="1.8" strokeLinecap="round">
          <Path d="M38.5 41 L45.5 41" />
          <Path d="M54.5 41 L61.5 41" />
        </G>
      )}
      {eyes === 'happy' && (
        <G stroke="#2b1a16" strokeWidth="1.8" strokeLinecap="round" fill="none">
          <Path d="M38.5 42 Q42 37 45.5 42" />
          <Path d="M54.5 42 Q58 37 61.5 42" />
        </G>
      )}
      {eyes === 'sad' && (
        <G stroke="#2b1a16" strokeWidth="1.8" strokeLinecap="round" fill="none">
          <Path d="M38.5 39 Q42 43 45.5 39" />
          <Path d="M54.5 39 Q58 43 61.5 39" />
        </G>
      )}

      {/* Yanaklar, burun, ağız */}
      <Circle cx="36" cy="48" r="3.4" fill={inner} opacity={0.55} />
      <Circle cx="64" cy="48" r="3.4" fill={inner} opacity={0.55} />
      {species === 'dog' ? (
        <Ellipse cx="50" cy="46.5" rx="3.6" ry="2.6" fill="#2b1a16" />
      ) : (
        <Path d="M48 46 L52 46 L50 48.5 Z" fill="#d9707f" />
      )}
      <Path d="M50 48.5 Q48 51.5 45.5 50 M50 48.5 Q52 51.5 54.5 50" stroke="#6a3a2e" strokeWidth="1" fill="none" strokeLinecap="round" />
      {species === 'cat' && (
        <G stroke="#fff6ec" strokeWidth="0.8" opacity={0.85}>
          <Path d="M30 46 L40 47" />
          <Path d="M30 50 L40 49" />
          <Path d="M70 46 L60 47" />
          <Path d="M70 50 L60 49" />
        </G>
      )}

      {/* Aksesuar */}
      {accessory === 'collar' && (
        <G>
          <Path d="M36 58 Q50 64 64 58" stroke={colors.roseDeep} strokeWidth="3" fill="none" strokeLinecap="round" />
          <Path
            d="M50 67 C46.5 64.5 45 63 45 61.3 C45 60 46 59 47.3 59 C48.4 59 49.3 59.7 50 60.6 C50.7 59.7 51.6 59 52.7 59 C54 59 55 60 55 61.3 C55 63 53.5 64.5 50 67 Z"
            fill={colors.gold}
          />
        </G>
      )}
      {accessory === 'bow' && (
        <G>
          <Path d="M50 24 L38 17 L38 31 Z M50 24 L62 17 L62 31 Z" fill="#d9785a" />
          <Circle cx="50" cy="24" r="3.2" fill="#b75a3f" />
        </G>
      )}
      {accessory === 'bandana' && <Path d="M34 57 Q50 64 66 57 L50 76 Z" fill="#5b7fa6" />}
    </Svg>
  );
}

function FloatingHearts() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 2200, useNativeDriver }).start();
  }, []);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {[-18, 0, 18].map((dx, i) => (
        <Animated.Text
          key={i}
          style={[
            styles.heart,
            {
              left: `${50 + dx}%`,
              opacity: v.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
              transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -40 - i * 8] }) }],
            },
          ]}
        >
          💗
        </Animated.Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  body: { width: '100%', flex: 1, transformOrigin: 'bottom' },
  tag: { backgroundColor: 'rgba(33,23,17,0.6)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, marginTop: -2 },
  name: { fontSize: 9, color: colors.cream, fontFamily: fonts.bodyBold },
  bubble: { position: 'absolute', top: -4, right: '8%', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1, zIndex: 2 },
  heart: { position: 'absolute', top: '10%', fontSize: 12, marginLeft: -6 },
});
