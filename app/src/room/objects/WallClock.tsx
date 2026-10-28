import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import { daysTogether } from '@loveroom/shared';
import { useRoom } from '../../state/room';
import { useNow } from '../../hooks/useNow';
import { colors, fonts } from '../../theme';
import { Focusable } from './Focusable';

/** İlişki saati: gerçek saati gösterir, kadranında birlikte geçen gün sayısı yazar. */
export function WallClock() {
  const anniversary = useRoom((r) => r.anniversary);
  const now = useNow(true, 30_000);
  const days = daysTogether(anniversary, now);
  const d = new Date(now);
  const minuteAngle = d.getMinutes() * 6;
  const hourAngle = (d.getHours() % 12) * 30 + d.getMinutes() * 0.5;

  return (
    <Focusable id="clock">
      <Svg width="100%" height="100%" viewBox="0 0 100 100">
        <Circle cx="50" cy="52" r="47" fill="rgba(0,0,0,0.25)" />
        <Circle cx="50" cy="50" r="47" fill={colors.goldDeep} />
        <Circle cx="50" cy="50" r="42" fill="#fff6ea" />
        {Array.from({ length: 12 }, (_, i) => (
          <Line
            key={i}
            x1="50"
            y1="12"
            x2="50"
            y2={i % 3 === 0 ? 17 : 15}
            stroke="#8a5a62"
            strokeWidth={i % 3 === 0 ? 1.6 : 0.9}
            transform={`rotate(${i * 30} 50 50)`}
          />
        ))}
        <Path
          d="M50 22 C47.5 20.2 46.4 19 46.4 17.7 C46.4 16.7 47.2 16 48.1 16 C48.9 16 49.5 16.5 50 17.2 C50.5 16.5 51.1 16 51.9 16 C52.8 16 53.6 16.7 53.6 17.7 C53.6 19 52.5 20.2 50 22 Z"
          fill={colors.roseDeep}
        />
        {days !== null ? (
          <G>
            <SvgText x="50" y="62" textAnchor="middle" fontSize="13" fontFamily={fonts.display} fill="#5a2a3d">
              {days}
            </SvgText>
            <SvgText x="50" y="71" textAnchor="middle" fontSize="6" fontFamily={fonts.bodySemi} fill="#8a5a62">
              gün birlikte
            </SvgText>
          </G>
        ) : (
          <SvgText x="50" y="68" textAnchor="middle" fontSize="7" fontFamily={fonts.bodySemi} fill="#8a5a62">
            sonsuza dek
          </SvgText>
        )}
        <Line x1="50" y1="50" x2="50" y2="31" stroke="#3b2230" strokeWidth="2.6" strokeLinecap="round" transform={`rotate(${hourAngle} 50 50)`} />
        <Line x1="50" y1="50" x2="50" y2="22" stroke="#3b2230" strokeWidth="1.6" strokeLinecap="round" transform={`rotate(${minuteAngle} 50 50)`} />
        <Circle cx="50" cy="50" r="2.4" fill={colors.roseDeep} />
      </Svg>
    </Focusable>
  );
}
