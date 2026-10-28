import { useRoomSync } from '../sync/useRoomSync';
import { useRoomStore } from '../state/room';
import { RoomNavigator } from '../room/RoomNavigator';
import { StatusScreen } from './StatusScreen';

export function RoomScreen() {
  useRoomSync();
  const hasRoom = useRoomStore((s) => !!s.room);
  return hasRoom ? <RoomNavigator /> : <StatusScreen />;
}
