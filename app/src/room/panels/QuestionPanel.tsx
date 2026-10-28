import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import {
  QUESTION_CATEGORIES,
  QUESTIONS,
  type AnsweredQuestion,
  type QuestionCategory,
} from '@loveroom/shared';
import { memberName, useDispatch, useMe, usePartner, useRoom, useRoomStore } from '../../state/room';
import { Button } from '../../ui/Button';
import { Body, Strong, Title } from '../../ui/Txt';
import { colors } from '../../theme';
import { panel } from './panelStyles';

const CATEGORY_ICON: Record<QuestionCategory, string> = { fun: '😄', deep: '🌙', memories: '📸', future: '🏡' };

/**
 * Soru kavanozu ("Ask Me More"): bir soru çekilir, ikiniz de cevaplarsınız; cevaplar ancak
 * ikiniz de yazınca açılır. Tamamlanan sorular anı defterinde birikir.
 */
export function QuestionPanel() {
  const question = useRoom((r) => r.question);
  const history = useRoom((r) => r.qaHistory);
  const me = useMe();
  const partner = usePartner();
  const dispatch = useDispatch();
  const [draft, setDraft] = useState('');

  const mine = me ? question?.answers[me.id] : undefined;
  const theirs = partner ? question?.answers[partner.id] : undefined;
  const bothAnswered = !!mine && !!theirs;

  const draw = (category: QuestionCategory) => {
    // Daha önce sorulanları atla; hepsi bittiyse baştan başla.
    const asked = new Set([question?.text, ...history.map((h) => h.text)]);
    const pool = QUESTIONS.filter((q) => q.category === category);
    const fresh = pool.filter((q) => !asked.has(q.text));
    const list = fresh.length ? fresh : pool;
    const pick = list[Math.floor(Math.random() * list.length)];
    setDraft('');
    dispatch({ type: 'question/draw', questionId: pick.id });
  };

  const categories = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {(Object.keys(QUESTION_CATEGORIES) as QuestionCategory[]).map((c) => (
        <Pressable key={c} onPress={() => draw(c)} style={panel.chip}>
          <Text style={panel.chipText}>
            {CATEGORY_ICON[c]} {QUESTION_CATEGORIES[c]}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );

  return (
    <>
      {!question ? (
        <>
          <Body color={colors.textDim}>Kavanozdan bir not çek. İkiniz de cevaplayınca cevaplarınız açılır.</Body>
          {categories}
        </>
      ) : (
        <>
          <Body size={12} color={colors.blush}>
            {CATEGORY_ICON[question.category as QuestionCategory]} {QUESTION_CATEGORIES[question.category as QuestionCategory]}
          </Body>
          <Title size={20}>{question.text}</Title>

          {bothAnswered ? (
            <>
              <Answer name={me!.name} text={mine!} />
              <Answer name={partner!.name} text={theirs!} />
              <Body size={12} color={colors.textDim}>
                Yeni bir not çek:
              </Body>
              {categories}
            </>
          ) : mine ? (
            <>
              <Answer name="Senin cevabın" text={mine} />
              <Body size={13} color={colors.textDim}>
                🔒 {partner ? `${partner.name} cevaplayınca ikinizinki de açılacak.` : 'Partnerin katılınca cevaplayabilecek.'}
              </Body>
            </>
          ) : (
            <>
              {theirs && (
                <Body size={13} color={colors.blush}>
                  {partner!.name} cevapladı — şimdi sıra sende 👀
                </Body>
              )}
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Cevabın…"
                placeholderTextColor="rgba(253,239,243,0.35)"
                multiline
                maxLength={500}
                style={[panel.input, { minHeight: 70, textAlignVertical: 'top' }]}
              />
              <Button
                label="Cevabımı gönder 💌"
                disabled={!draft.trim()}
                onPress={() => {
                  dispatch({ type: 'question/answer', text: draft });
                  setDraft('');
                }}
              />
            </>
          )}
        </>
      )}
      {history.length > 0 && <Diary history={history} />}
    </>
  );
}

function Answer({ name, text }: { name: string; text: string }) {
  return (
    <View style={panel.card}>
      <Strong size={12} color={colors.blush}>
        {name}
      </Strong>
      <Body>{text}</Body>
    </View>
  );
}

function Diary({ history }: { history: AnsweredQuestion[] }) {
  const [open, setOpen] = useState(false);
  const room = useRoomStore((s) => s.room!);
  return (
    <View style={{ gap: 8 }}>
      <Pressable onPress={() => setOpen((o) => !o)}>
        <Strong size={13} color={colors.gold}>
          📖 Anı defterimiz ({history.length}) {open ? '▴' : '▾'}
        </Strong>
      </Pressable>
      {open &&
        history.slice(0, 10).map((h) => (
          <View key={h.at} style={panel.card}>
            <Strong size={13}>{h.text}</Strong>
            {Object.entries(h.answers).map(([id, text]) => (
              <Body key={id} size={13} color={colors.textDim}>
                <Text style={{ color: colors.blush }}>{memberName(room, id)}:</Text> {text}
              </Body>
            ))}
          </View>
        ))}
    </View>
  );
}
