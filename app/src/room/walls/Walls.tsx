import { StyleSheet, View } from 'react-native';
import { useRoom } from '../../state/room';
import { WallCanvas, Placed, type LightSource } from '../WallCanvas';
import { DECOR, LAYOUT } from '../layout';
import { useLighting } from '../lighting';
import { TV } from '../objects/TV';
import { Pet } from '../objects/Pet';
import { Sofa } from '../objects/Sofa';
import { WallClock } from '../objects/WallClock';
import { Fireplace } from '../objects/Fireplace';
import { RoomWindow } from '../objects/RoomWindow';
import { PhotoFrame } from '../objects/PhotoFrame';
import { RecordPlayer } from '../objects/RecordPlayer';
import { QuestionJar } from '../objects/QuestionJar';
import {
  Armchair,
  Bookshelf,
  CoffeeTable,
  FloorLamp,
  GameConsole,
  JuteRug,
  LogBasket,
  LowCabinet,
  MediaConsole,
  MiniFrame,
  Plant,
  Pouf,
  Rug,
  Sheepskin,
} from '../decor/Furniture';

const CANDLE = '#ffbf6e';

// Çocuk sırası = çizim sırası (önce arkadakiler). Her duvar kendi ışık kaynaklarını tanımlar.

/**
 * Ön duvar — sinema köşesi: büyük TV, TV ünitesi, iki yanda bitkiler, kilim, oyun konsolu, puf ve kedi.
 * Film oynarken oda kararır (sinema modu); TV kendi ışığıyla parlar.
 */
export function FrontWall() {
  const lighting = useLighting();
  const tv = useRoom((r) => r.tv);
  const cinema = tv.on && tv.playing;
  const lights: LightSource[] = [
    { x: 0.5, y: 0.32, rx: 0.6, ry: 0.42, color: '#a9bcff', strength: tv.on ? (cinema ? 0.75 : 0.45) : 0 },
    { x: 0.5, y: 0.8, rx: 0.5, ry: 0.15, color: '#a9bcff', strength: cinema ? 0.35 : 0 },
    { x: 0.2, y: 0.53, rx: 0.12, ry: 0.1, color: CANDLE, strength: lighting.lamps * 0.7 },
  ];

  return (
    <WallCanvas
      wall="front"
      lighting={lighting}
      lights={lights}
      emissive={
        <Placed rect={LAYOUT.tv}>
          <TV />
        </Placed>
      }
    >
      <Placed rect={DECOR.frontRug}>
        <Rug />
      </Placed>
      <Placed rect={DECOR.console}>
        <MediaConsole />
      </Placed>
      <Placed rect={DECOR.frontPlantL}>
        <Plant tall />
      </Placed>
      <Placed rect={DECOR.frontPlantR}>
        <Plant tall />
      </Placed>
      <Placed rect={DECOR.gameConsole}>
        <GameConsole />
      </Placed>
      <Placed rect={DECOR.pouf}>
        <Pouf />
      </Placed>
      <Placed rect={LAYOUT.pet}>
        <Pet />
      </Placed>
      {cinema && <View style={styles.cinema} pointerEvents="none" />}
    </WallCanvas>
  );
}

/** Sağ duvar — pencere kenarı: polaroidler, pencere, kitaplık; pencerenin altında pikap ve soru kavanozu. */
export function RightWall() {
  const lighting = useLighting();
  const sunColor = lighting.sky === 'golden' || lighting.sky === 'dawn' ? '#ffc27a' : '#fff4dc';
  const lights: LightSource[] = [
    { x: 0.5, y: 0.28, rx: 0.42, ry: 0.36, color: sunColor, strength: lighting.daylight * 0.55 },
    { x: 0.52, y: 0.86, rx: 0.36, ry: 0.12, color: sunColor, strength: lighting.daylight * 0.45 },
    { x: 0.5, y: 0.28, rx: 0.3, ry: 0.3, color: '#8fa6ff', strength: (1 - lighting.daylight) * lighting.night * 0.45 },
    { x: 0.42, y: 0.55, rx: 0.12, ry: 0.08, color: CANDLE, strength: lighting.lamps * 0.35 },
  ];

  return (
    <WallCanvas wall="right" lighting={lighting} lights={lights}>
      <Placed rect={LAYOUT.window}>
        <RoomWindow sky={lighting.sky} />
      </Placed>
      <Placed rect={LAYOUT['photo-right-1']}>
        <PhotoFrame id="photo-right-1" />
      </Placed>
      <Placed rect={LAYOUT['photo-right-2']}>
        <PhotoFrame id="photo-right-2" />
      </Placed>
      <Placed rect={DECOR.bookshelf}>
        <Bookshelf />
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
      <Placed rect={DECOR.rightPlant}>
        <Plant />
      </Placed>
    </WallCanvas>
  );
}

/** Arka duvar — kanepemiz: ilişki saati, galeri çerçeveleri, kanepe, lambader, sehpa, peri ışıkları. */
export function BackWall() {
  const lighting = useLighting();
  const lights: LightSource[] = [
    { x: 0.86, y: 0.24, rx: 0.3, ry: 0.32, color: '#ffcf8a', strength: lighting.lamps },
    { x: 0.7, y: 0.6, rx: 0.4, ry: 0.3, color: '#ffcf8a', strength: lighting.lamps * 0.4 },
    { x: 0.42, y: 0.86, rx: 0.12, ry: 0.07, color: CANDLE, strength: lighting.lamps * 0.6 },
  ];

  return (
    <WallCanvas wall="back" lighting={lighting} lights={lights} fairyLights>
      <Placed rect={DECOR.gallery1}>
        <MiniFrame variant={0} />
      </Placed>
      <Placed rect={DECOR.gallery2}>
        <MiniFrame variant={1} />
      </Placed>
      <Placed rect={LAYOUT.clock}>
        <WallClock />
      </Placed>
      <Placed rect={DECOR.backRug}>
        <JuteRug />
      </Placed>
      <Placed rect={DECOR.backPlant}>
        <Plant tall />
      </Placed>
      <Placed rect={DECOR.lamp}>
        <FloorLamp lit={lighting.lamps} />
      </Placed>
      <Placed rect={LAYOUT.sofa}>
        <Sofa />
      </Placed>
      <Placed rect={DECOR.coffeeTable}>
        <CoffeeTable />
      </Placed>
    </WallCanvas>
  );
}

/** Sol duvar — şömine başı: Tablo 1, şömine, Tablo 2, berjer, odun sepeti ve post. */
export function LeftWall() {
  const lighting = useLighting();
  const lit = useRoom((r) => r.fireplaceLit);
  const lights: LightSource[] = [
    { x: 0.5, y: 0.72, rx: 0.5, ry: 0.32, color: '#ff8a3c', strength: lit ? 0.85 : 0 },
    { x: 0.5, y: 0.45, rx: 0.32, ry: 0.4, color: '#ff9f50', strength: lit ? 0.35 : 0 },
    { x: 0.37, y: 0.25, rx: 0.08, ry: 0.07, color: CANDLE, strength: lighting.lamps * 0.8 },
  ];

  return (
    <WallCanvas wall="left" lighting={lighting} lights={lights}>
      <Placed rect={LAYOUT['frame-left-1']}>
        <PhotoFrame id="frame-left-1" />
      </Placed>
      <Placed rect={LAYOUT['frame-left-2']}>
        <PhotoFrame id="frame-left-2" />
      </Placed>
      <Placed rect={DECOR.sheepskin}>
        <Sheepskin />
      </Placed>
      <Placed rect={LAYOUT.fireplace}>
        <Fireplace />
      </Placed>
      <Placed rect={DECOR.logBasket}>
        <LogBasket />
      </Placed>
      <Placed rect={DECOR.armchair}>
        <Armchair />
      </Placed>
    </WallCanvas>
  );
}

const styles = StyleSheet.create({
  cinema: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(12,10,22,0.5)' },
});
