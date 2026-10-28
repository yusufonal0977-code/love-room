import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { useRoom } from '../../state/room';
import { WallCanvas, Placed } from '../WallCanvas';
import { DECOR, LAYOUT } from '../layout';
import { TV } from '../objects/TV';
import { Pet } from '../objects/Pet';
import { Sofa } from '../objects/Sofa';
import { WallClock } from '../objects/WallClock';
import { Fireplace } from '../objects/Fireplace';
import { RoomWindow } from '../objects/RoomWindow';
import { PhotoFrame } from '../objects/PhotoFrame';
import { RecordPlayer } from '../objects/RecordPlayer';
import { QuestionJar } from '../objects/QuestionJar';
import { FloorLamp, LowCabinet, MediaConsole, Plant, Rug } from '../decor/Furniture';

// Çocuk sırası = çizim sırası (önce arkadakiler).

/** Ön duvar: büyük TV, altında TV ünitesi, zeminde halı ve halının üstünde ortak kedi. */
export function FrontWall() {
  return (
    <WallCanvas wall="front">
      <Placed rect={DECOR.rug}>
        <Rug />
      </Placed>
      <Placed rect={DECOR.console}>
        <MediaConsole />
      </Placed>
      <Placed rect={LAYOUT.tv}>
        <TV />
      </Placed>
      <Placed rect={LAYOUT.pet}>
        <Pet />
      </Placed>
    </WallCanvas>
  );
}

/** Sağ duvar: polaroid, pencere, polaroid; pencerenin altında pikap ve soru kavanozu. */
export function RightWall() {
  return (
    <WallCanvas wall="right">
      <Placed rect={LAYOUT.window}>
        <RoomWindow />
      </Placed>
      <Placed rect={DECOR.cabinet}>
        <LowCabinet />
      </Placed>
      <Placed rect={LAYOUT.record}>
        <RecordPlayer />
      </Placed>
      <Placed rect={LAYOUT.jar}>
        <QuestionJar />
      </Placed>
      <Placed rect={LAYOUT['photo-right-1']}>
        <PhotoFrame id="photo-right-1" />
      </Placed>
      <Placed rect={LAYOUT['photo-right-2']}>
        <PhotoFrame id="photo-right-2" />
      </Placed>
      <Placed rect={DECOR.plantRight}>
        <Plant />
      </Placed>
    </WallCanvas>
  );
}

/** Arka duvar: ilişki saati, kanepe, lambader ve bitki. */
export function BackWall() {
  return (
    <WallCanvas wall="back">
      <Placed rect={LAYOUT.clock}>
        <WallClock />
      </Placed>
      <Placed rect={DECOR.lamp}>
        <FloorLamp />
      </Placed>
      <Placed rect={DECOR.plantBack}>
        <Plant />
      </Placed>
      <Placed rect={LAYOUT.sofa}>
        <Sofa />
      </Placed>
    </WallCanvas>
  );
}

/** Sol duvar: Tablo 1, şömine, Tablo 2. Şömine yanınca duvara ve zemine sıcak bir ışık vurur. */
export function LeftWall() {
  const lit = useRoom((r) => r.fireplaceLit);
  return (
    <WallCanvas wall="left" extraGlow={lit ? <FireGlow /> : null}>
      <Placed rect={LAYOUT['frame-left-1']}>
        <PhotoFrame id="frame-left-1" />
      </Placed>
      <Placed rect={LAYOUT['frame-left-2']}>
        <PhotoFrame id="frame-left-2" />
      </Placed>
      <Placed rect={LAYOUT.fireplace}>
        <Fireplace />
      </Placed>
    </WallCanvas>
  );
}

function FireGlow() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id="left-fireglow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#ff9a4a" stopOpacity={0.35} />
            <Stop offset="1" stopColor="#ff9a4a" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx="50" cy="72" rx="48" ry="34" fill="url(#left-fireglow)" />
      </Svg>
    </View>
  );
}
