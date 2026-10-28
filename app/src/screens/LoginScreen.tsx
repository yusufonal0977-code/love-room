import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { AuthResponse, InvitePreview } from '@loveroom/shared';
import { api, errorText } from '../lib/api';
import { useSession } from '../state/session';
import { GoogleButton, googleAvailable } from '../auth/GoogleButton';
import { Backdrop } from '../ui/Backdrop';
import { Logo } from '../ui/Logo';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { Avatar } from '../ui/Avatar';
import { Body, Strong } from '../ui/Txt';
import { colors } from '../theme';
import { isLocalWeb } from '../config';

const FEATURES = [
  ['🎬', 'Aynı anda film'],
  ['🐾', 'Ortak evcil hayvan'],
  ['🖼️', 'Anı panoları'],
  ['🤗', 'Uzaktan sarılma'],
] as const;

export function LoginScreen() {
  const config = useSession((s) => s.config)!;
  const signIn = useSession((s) => s.signIn);
  const pendingInvite = useSession((s) => s.pendingInvite);
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [devName, setDevName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pendingInvite) api<InvitePreview>(`/invites/${pendingInvite}`).then(setInvite, () => setInvite(null));
  }, [pendingInvite]);

  const run = async (fn: () => Promise<AuthResponse>, perTab: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await signIn(await fn(), perTab);
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };

  const google = googleAvailable(config.googleClientId);

  return (
    <Backdrop>
      <Logo />

      {invite && (
        <Card style={styles.invite}>
          <Avatar name={invite.inviter.name} url={invite.inviter.avatarUrl} size={44} />
          <View style={{ flex: 1 }}>
            <Strong>{invite.inviter.name} seni bekliyor 💌</Strong>
            <Body size={13} color={colors.textDim}>
              “{invite.roomName}” odasına katılmak için giriş yap.
            </Body>
          </View>
        </Card>
      )}

      <View style={styles.features}>
        {FEATURES.map(([icon, label]) => (
          <View key={label} style={styles.chip}>
            <Body size={13}>
              {icon} {label}
            </Body>
          </View>
        ))}
      </View>

      <Card>
        {google && (
          <GoogleButton
            webClientId={config.googleClientId!}
            onIdToken={(idToken) => run(() => api<AuthResponse>('/auth/google', { body: { idToken } }), false)}
          />
        )}
        {!google && !config.devLogin && (
          <Body center color={colors.textDim}>
            Google girişi henüz yapılandırılmadı.
          </Body>
        )}

        {config.devLogin && (
          <View style={{ gap: 12 }}>
            {google && <Divider />}
            <Field
              label={isLocalWeb ? 'Geliştirme girişi — sadece adınla' : 'Hızlı giriş — sadece adınla'}
              value={devName}
              onChangeText={setDevName}
              placeholder="Örn. Ayşe"
              autoCapitalize="words"
              onSubmitEditing={() => devName.trim() && run(() => api('/auth/dev', { body: { name: devName.trim() } }), true)}
            />
            <Button
              variant={google ? 'ghost' : 'primary'}
              label="Hızlı giriş"
              loading={busy}
              disabled={!devName.trim()}
              onPress={() => run(() => api('/auth/dev', { body: { name: devName.trim() } }), true)}
            />
            {!google && isLocalWeb && (
              <Body size={12} color={colors.textDim} center>
                Google girişini açmak için server/.env dosyasına GOOGLE_CLIENT_ID ekle.
              </Body>
            )}
          </View>
        )}

        {error && (
          <Body size={13} color={colors.blush} center>
            {error}
          </Body>
        )}
      </Card>
    </Backdrop>
  );
}

function Divider() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={styles.rule} />
      <Body size={12} color={colors.textDim}>
        veya
      </Body>
      <View style={styles.rule} />
    </View>
  );
}

const styles = StyleSheet.create({
  invite: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderColor: 'rgba(217,120,90,0.45)' },
  features: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  chip: { backgroundColor: colors.glass, borderColor: colors.line, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  rule: { flex: 1, height: 1, backgroundColor: colors.line },
});
