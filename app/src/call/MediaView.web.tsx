import { useEffect, useRef } from 'react';

interface Props {
  stream: MediaStream | null;
  muted?: boolean;
  mirror?: boolean;
  hidden?: boolean;
}

/** Bir MediaStream'i <video> ile oynatır (web). Sesli aramada gizli kalıp sadece sesi çalar. */
export function MediaView({ stream, muted, mirror, hidden }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      style={{
        width: hidden ? 1 : '100%',
        height: hidden ? 1 : '100%',
        opacity: hidden ? 0 : 1,
        position: hidden ? 'absolute' : undefined,
        objectFit: 'cover',
        transform: mirror ? 'scaleX(-1)' : undefined,
        backgroundColor: '#17110d',
      }}
    />
  );
}
