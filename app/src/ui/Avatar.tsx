import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';

interface Props {
  name: string;
  url?: string | null;
  size?: number;
  online?: boolean;
  ring?: string;
}

export function Avatar({ name, url, size = 36, online, ring = colors.blush }: Props) {
  return (
    <View style={{ width: size, height: size }}>
      <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, borderColor: ring }]}>
        {url ? (
          <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} />
        ) : (
          <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{name.slice(0, 1).toLocaleUpperCase('tr')}</Text>
        )}
      </View>
      {online !== undefined && (
        <View
          style={[
            styles.dot,
            { width: size * 0.3, height: size * 0.3, borderRadius: size, backgroundColor: online ? colors.online : '#8a7a86' },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    overflow: 'hidden',
    backgroundColor: colors.roseDeep,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { color: '#fff', fontFamily: fonts.bodyBold },
  dot: { position: 'absolute', right: -1, bottom: -1, borderWidth: 2, borderColor: colors.night },
});
