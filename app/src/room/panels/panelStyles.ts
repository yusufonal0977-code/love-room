import { StyleSheet } from 'react-native';
import { colors, fonts } from '../../theme';

/** Odak panellerinde ortak kullanılan küçük parçalar. */
export const panel = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.glass },
  chipActive: { borderColor: colors.rose, backgroundColor: 'rgba(236,122,150,0.2)' },
  chipText: { color: colors.text, fontFamily: fonts.bodySemi, fontSize: 13 },
  input: {
    flex: 1,
    minWidth: 160,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  card: { backgroundColor: colors.glass, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.line, gap: 4 },
});
