// Sesli/görüntülü arama için sinyal mesajları. Medya eşler arası (WebRTC) akar;
// sunucu sadece bu küçük mesajları odadaki diğer kişiye iletir.

export type CallKind = 'audio' | 'video';

export type CallSignal =
  | { type: 'ring'; kind: CallKind }
  | { type: 'accept' }
  | { type: 'decline' }
  | { type: 'busy' }
  | { type: 'hangup' }
  | { type: 'offer'; sdp: string }
  | { type: 'answer'; sdp: string }
  | { type: 'ice'; candidate: { candidate: string; sdpMid: string | null; sdpMLineIndex: number | null } };

const MAX_SDP = 40_000;

export function isCallSignal(x: unknown): x is CallSignal {
  if (!x || typeof x !== 'object') return false;
  const s = x as Record<string, unknown>;
  switch (s.type) {
    case 'ring':
      return s.kind === 'audio' || s.kind === 'video';
    case 'offer':
    case 'answer':
      return typeof s.sdp === 'string' && s.sdp.length < MAX_SDP;
    case 'ice': {
      const c = s.candidate as Record<string, unknown> | undefined;
      return !!c && typeof c.candidate === 'string' && c.candidate.length < 2000;
    }
    case 'accept':
    case 'decline':
    case 'busy':
    case 'hangup':
      return true;
    default:
      return false;
  }
}
