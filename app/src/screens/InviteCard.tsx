import { useState } from 'react';
import { Platform, Share, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { buildInviteLink } from '../lib/inviteLink';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Body } from '../ui/Txt';
import { colors, fonts } from '../theme';

/** Davet linki + kopyala/paylaş. Hem kurulum ekranında hem oda içi menüde kullanılır. */
export function InviteCard({ code }: { code: string }) {
  const link = buildInviteLink(code);
  const [copied, setCopied] = useState(false);
  const canShare = Platform.OS !== 'web' || (typeof navigator !== 'undefined' && !!navigator.share);

  const copy = async () => {
    await Clipboard.setStringAsync(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Card>
      <View style={styles.linkBox}>
        <Body size={14} style={{ fontFamily: fonts.bodySemi }} numberOfLines={1} selectable>
          {link}
        </Body>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button style={{ flex: 1 }} variant="ghost" label={copied ? 'Kopyalandı ✓' : 'Linki kopyala'} onPress={copy} />
        {canShare && (
          <Button
            style={{ flex: 1 }}
            variant="ghost"
            label="Paylaş"
            onPress={() => void Share.share({ message: `Love Room'da seni bekliyorum 💌 ${link}`, url: link })}
          />
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  linkBox: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderStyle: 'dashed',
  },
});
