import { Text, type TextProps } from 'react-native';
import { colors, fonts } from '../theme';

type Props = TextProps & { size?: number; color?: string; center?: boolean };

/** Başlık: romantik italik serif. */
export function Title({ size = 30, color = colors.text, center, style, ...rest }: Props) {
  return (
    <Text
      {...rest}
      style={[{ fontFamily: fonts.display, fontSize: size, color, textAlign: center ? 'center' : undefined }, style]}
    />
  );
}

export function Body({ size = 15, color = colors.text, center, style, ...rest }: Props) {
  return (
    <Text
      {...rest}
      style={[
        { fontFamily: fonts.body, fontSize: size, color, lineHeight: size * 1.45, textAlign: center ? 'center' : undefined },
        style,
      ]}
    />
  );
}

export function Strong({ size = 15, color = colors.text, center, style, ...rest }: Props) {
  return (
    <Text
      {...rest}
      style={[{ fontFamily: fonts.bodyBold, fontSize: size, color, textAlign: center ? 'center' : undefined }, style]}
    />
  );
}
