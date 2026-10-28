import { Pressable, StyleSheet, Text, View } from 'react-native';
import { gameOver, type GameKind, type MemoryGame, type XoxGame } from '@loveroom/shared';
import { memberName, useDispatch, useRoom, useRoomStore } from '../../state/room';
import { Button } from '../../ui/Button';
import { Body, Strong } from '../../ui/Txt';
import { colors, fonts } from '../../theme';

const GAMES: { kind: GameKind; title: string; desc: string }[] = [
  { kind: 'xox', title: '❌⭕ XOX', desc: 'Klasik üçte üç. Sırayla oynayın.' },
  { kind: 'memory', title: '🃏 Hafıza kartları', desc: 'Eşleri bulun; eşleşen tekrar oynar.' },
];

const newSeed = () => Math.floor(Math.random() * 2 ** 31);

/** TV önündeki konsol: mini oyunlar. Oyun durumu odada tutulur, iki ekranda da aynı anda oynanır. */
export function GamePanel() {
  const game = useRoom((r) => r.game);
  const dispatch = useDispatch();

  if (!game) {
    return (
      <View style={{ gap: 10 }}>
        <Body color={colors.textDim}>Bir oyun seçin; partnerinin ekranı da konsola döner.</Body>
        {GAMES.map((g) => (
          <Pressable key={g.kind} style={styles.gameCard} onPress={() => dispatch({ type: 'game/start', game: g.kind, seed: newSeed() })}>
            <Strong>{g.title}</Strong>
            <Body size={12} color={colors.textDim}>
              {g.desc}
            </Body>
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      <Status />
      {game.kind === 'xox' ? <XoxBoard game={game} /> : <MemoryBoard game={game} />}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {gameOver(game) && (
          <Button style={{ flex: 1 }} small label="Yeniden oyna" onPress={() => dispatch({ type: 'game/start', game: game.kind, seed: newSeed() })} />
        )}
        <Button style={{ flex: 1 }} small variant="ghost" label="Oyunu kapat" onPress={() => dispatch({ type: 'game/close' })} />
      </View>
    </View>
  );
}

function Status() {
  const game = useRoom((r) => r.game!);
  const room = useRoomStore((s) => s.room!);
  const userId = useRoomStore((s) => s.userId);
  const name = (id: string) => (id === userId ? 'Sen' : memberName(room, id));

  let text: string;
  if (game.kind === 'xox' && game.winner) {
    text = game.winner === 'draw' ? 'Berabere! 🤝' : `${name(game.winner)} kazandı 🎉`;
  } else if (game.kind === 'memory' && gameOver(game)) {
    const [a, b] = game.players.map((p) => game.scores[p] ?? 0);
    text = b === undefined || a === b ? `Bitti! ${a} çift buldunuz 💞` : `${name(a > b ? game.players[0] : game.players[1])} kazandı 🎉`;
  } else {
    text = game.turn === userId ? 'Sıra sende' : `Sıra ${name(game.turn)}'de…`;
  }

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Strong size={15}>{text}</Strong>
      {game.kind === 'memory' && (
        <Body size={12} color={colors.textDim}>
          {game.players.map((p) => `${name(p)}: ${game.scores[p] ?? 0}`).join(' · ')}
        </Body>
      )}
    </View>
  );
}

function XoxBoard({ game }: { game: XoxGame }) {
  const dispatch = useDispatch();
  const userId = useRoomStore((s) => s.userId);
  const mark = (id: string | null) => (id === null ? '' : id === game.players[0] ? '❌' : '⭕');
  const myTurn = game.turn === userId && !game.winner;

  return (
    <View style={styles.xox}>
      {game.board.map((cell, i) => (
        <Pressable
          key={i}
          disabled={!myTurn || !!cell}
          onPress={() => dispatch({ type: 'game/move', index: i })}
          style={[styles.xoxCell, myTurn && !cell && styles.cellActive]}
        >
          <Text style={styles.xoxMark}>{mark(cell)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function MemoryBoard({ game }: { game: MemoryGame }) {
  const dispatch = useDispatch();
  const userId = useRoomStore((s) => s.userId);
  const myTurn = game.turn === userId && !gameOver(game);

  return (
    <View style={styles.memory}>
      {game.deck.map((card, i) => {
        const shown = game.open.includes(i) || game.matched.includes(i);
        return (
          <Pressable
            key={i}
            disabled={!myTurn || shown}
            onPress={() => dispatch({ type: 'game/move', index: i })}
            style={[styles.card, shown ? styles.cardFace : styles.cardBack, game.matched.includes(i) && { opacity: 0.55 }]}
          >
            <Text style={{ fontSize: 22, color: colors.blush }}>{shown ? card : '♥'}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  gameCard: { backgroundColor: colors.glass, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.line, gap: 2 },
  xox: { flexDirection: 'row', flexWrap: 'wrap', width: 210, alignSelf: 'center', gap: 6 },
  xoxCell: {
    width: 66,
    height: 66,
    borderRadius: 14,
    backgroundColor: 'rgba(255,244,230,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  cellActive: { borderColor: colors.rose },
  xoxMark: { fontSize: 30 },
  memory: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxWidth: 300, alignSelf: 'center' },
  card: { width: 66, height: 66, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardBack: { backgroundColor: colors.roseDeep, borderWidth: 2, borderColor: colors.blush },
  cardFace: { backgroundColor: colors.cream },
  _unused: { fontFamily: fonts.body },
});
