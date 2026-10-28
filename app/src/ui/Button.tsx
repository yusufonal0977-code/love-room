import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts } from '../theme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'light';
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ label, onPress, variant = 'primary', icon, disabled, loading, small, style }: Props) {
  const content = (
    <View style={[styles.inner, small && styles.small]}>
      {loading ? <ActivityIndicator color={variant === 'light' ? colors.plum : '#fff'} /> : icon}
      <Text style={[styles.label, small && { fontSize: 13 }, variant === 'light' && { color: '#2b1a2f' }]}>{label}</Text>
    </View>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        variant === 'ghost' && styles.ghost,
        variant === 'light' && styles.light,
        (disabled || loading) && { opacity: 0.5 },
        pressed && { transform: [{ scale: 0.97 }] },
        style,
      ]}
    >
      {variant === 'primary' ? (
        <LinearGradient colors={[colors.rose, colors.roseDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
          {content}
        </LinearGradient>
      ) : (
        content
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 999, overflow: 'hidden' },
  gradient: { borderRadius: 999 },
  inner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 22 },
  small: { paddingVertical: 9, paddingHorizontal: 14, gap: 6 },
  label: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 15, letterSpacing: 0.2 },
  ghost: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.glass },
  light: { backgroundColor: '#fff' },
});
