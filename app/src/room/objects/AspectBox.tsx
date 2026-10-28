import { useState, type ReactNode } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';

/**
 * İçeriği verilen en-boy oranında, kutuya sığacak en büyük boyutta ortalar.
 * SVG çizimin üstüne konan video/fotoğraf katmanlarının birebir hizalanması için gerekli.
 */
export function AspectBox({
  ratio,
  children,
  align = 'center',
}: {
  ratio: number;
  children: ReactNode;
  align?: 'center' | 'flex-end';
}) {
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    const w = Math.min(width, height * ratio);
    setBox({ w, h: w / ratio });
  };
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: align }} onLayout={onLayout} pointerEvents="box-none">
      {box && <View style={{ width: box.w, height: box.h }}>{children}</View>}
    </View>
  );
}
