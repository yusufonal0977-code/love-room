import { useEffect } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as WebBrowser from 'expo-web-browser';
import { PlayfairDisplay_400Regular_Italic, PlayfairDisplay_700Bold_Italic } from '@expo-google-fonts/playfair-display';
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { useSession } from './src/state/session';
import { StatusScreen } from './src/screens/StatusScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { CreateRoomScreen } from './src/screens/CreateRoomScreen';
import { InviteShareScreen } from './src/screens/InviteShareScreen';
import { InviteAcceptScreen } from './src/screens/InviteAcceptScreen';
import { RoomScreen } from './src/screens/RoomScreen';
import { colors } from './src/theme';

// Google giriş penceresi uygulamaya geri döndüğünde açılır pencereyi kapatır (web).
WebBrowser.maybeCompleteAuthSession();

export default function App() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_700Bold_Italic,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_800ExtraBold,
  });
  const boot = useSession((s) => s.boot);
  useEffect(() => void boot(), []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.night }}>
      <StatusBar style="light" />
      {fontsLoaded ? <Router /> : null}
    </View>
  );
}

/** Ekran akışı: açılış → giriş → (davet kabulü | oda kurma) → davet paylaşma → oda. */
function Router() {
  const phase = useSession((s) => s.phase);
  const room = useSession((s) => s.room);
  const pendingInvite = useSession((s) => s.pendingInvite);
  const showInviteShare = useSession((s) => s.showInviteShare);
  const boot = useSession((s) => s.boot);

  if (phase === 'loading') return <StatusScreen />;
  if (phase === 'offline') return <StatusScreen offline onRetry={boot} />;
  if (phase === 'signedOut') return <LoginScreen />;
  if (pendingInvite) return <InviteAcceptScreen code={pendingInvite} />;
  if (!room) return <CreateRoomScreen />;
  if (showInviteShare) return <InviteShareScreen />;
  return <RoomScreen />;
}
