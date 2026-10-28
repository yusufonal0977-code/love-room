import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, webStyle } from '../theme';

/** Buzlu cam görünümlü kart. */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.glass,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 24,
    padding: 22,
    gap: 16,
    ...webStyle({ backdropFilter: 'blur(14px)' }),
  },
});
