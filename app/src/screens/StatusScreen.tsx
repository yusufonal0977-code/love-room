import { ActivityIndicator } from 'react-native';
import { Backdrop } from '../ui/Backdrop';
import { Logo } from '../ui/Logo';
import { Button } from '../ui/Button';
import { Body } from '../ui/Txt';
import { colors } from '../theme';

/** Açılış ve "sunucuya ulaşılamadı" ekranı. */
export function StatusScreen({ offline, onRetry }: { offline?: boolean; onRetry?: () => void }) {
  return (
    <Backdrop>
      <Logo tagline={!offline} />
      {offline ? (
        <>
          <Body center color={colors.blush}>
            Sunucuya ulaşılamadı. Sunucu penceresinin açık olduğundan emin ol.
          </Body>
          {onRetry && <Button variant="ghost" label="Tekrar dene" onPress={onRetry} />}
        </>
      ) : (
        <ActivityIndicator color={colors.rose} />
      )}
    </Backdrop>
  );
}
