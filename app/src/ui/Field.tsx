import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fonts } from '../theme';
import { Body } from './Txt';

export function Field({ label, hint, ...rest }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Body size={13} color={colors.textDim}>
        {label}
      </Body>
      <TextInput placeholderTextColor="rgba(253,239,243,0.35)" {...rest} style={[styles.input, rest.style]} />
      {hint ? (
        <Body size={12} color={colors.textDim}>
          {hint}
        </Body>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: colors.text,
    fontFamily: fonts.bodySemi,
    fontSize: 16,
  },
});
