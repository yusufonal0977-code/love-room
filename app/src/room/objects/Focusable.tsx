import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import type { ObjectId } from '@loveroom/shared';
import { useDispatch, useIsFocused } from '../../state/room';

/** Dokununca objeyi iki ekranda da odağa alır. Odaktayken dokunuşlar içerideki kontrollere kalır. */
export function Focusable({ id, children }: { id: ObjectId; children: ReactNode }) {
  const focused = useIsFocused(id);
  const dispatch = useDispatch();
  return (
    <Pressable
      style={StyleSheet.absoluteFill}
      onPress={() => !focused && dispatch({ type: 'focus/set', objectId: id })}
    >
      {children}
    </Pressable>
  );
}
