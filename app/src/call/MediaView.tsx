// Mobil: WebRTC için react-native-webrtc'nin RTCView'u gerekir (development build).
// Şimdilik aramalar web'de; mobilde bu bileşen boş kalır.
interface Props {
  stream: MediaStream | null;
  muted?: boolean;
  mirror?: boolean;
  hidden?: boolean;
}

export function MediaView(_props: Props) {
  return null;
}
