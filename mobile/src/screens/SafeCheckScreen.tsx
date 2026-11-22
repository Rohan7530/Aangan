import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View, type ScrollViewInstance } from 'react-native';
import { askFamily, demoGuardian, shieldCheck, Unreachable, type ShieldVerdict } from '../api';
import { useApp } from '../state';
import { EXAMPLE_SCAM, fill, SPEECH_LANG } from '../strings';
import { radius, useTheme, type Palette } from '../theme';
import { Button, Card, Header, useStyles, type IconName } from '../ui';

const ICON: Record<ShieldVerdict['level'], IconName> = { safe: 'checkmark-circle', caution: 'alert-circle', danger: 'warning' };

// "Is this safe?": paste a message from SMS or WhatsApp; the scam shield answers
// in the reader's language and can read it aloud or send it to the family.
export function SafeCheckScreen({ onBack }: { onBack: () => void }) {
  const { t, fs, session, prefs } = useApp();
  const c = useTheme();
  const s = useStyles(makeStyles);
  const [text, setText] = useState('');
  const [verdict, setVerdict] = useState<ShieldVerdict | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [asking, setAsking] = useState(false);
  const [asked, setAsked] = useState<string | null>(null);
  const scroll = useRef<ScrollViewInstance>(null);
  const guardian = session ? demoGuardian(session) : null;

  useEffect(() => () => void Speech.stop(), []);

  function reset(next: string) {
    setText(next);
    setVerdict(null);
    setAsked(null);
    setError(null);
    if (speaking) void Speech.stop();
  }

  function speak(v: ShieldVerdict) {
    void Speech.stop();
    setSpeaking(true);
    Speech.speak([v.title, ...v.advice].join('. '), {
      language: SPEECH_LANG[prefs.language],
      rate: 0.9,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  }

  async function check() {
    if (!session || !text.trim()) return;
    setChecking(true);
    setError(null);
    setAsked(null);
    try {
      const v = await shieldCheck(session.authKey, text.trim(), prefs.language);
      setVerdict(v);
      speak(v);
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 150);
    } catch (e) {
      setError(e instanceof Unreachable ? t.cannotReach : e instanceof Error ? e.message : t.cannotReach);
    } finally {
      setChecking(false);
    }
  }

  async function ask() {
    if (!session || !guardian || !verdict) return;
    setAsking(true);
    setError(null);
    try {
      const r = await askFamily(session.authKey, {
        guardianId: guardian.userId,
        text: text.trim(),
        level: verdict.level,
        category: verdict.category,
      });
      setAsked(fill(t.askedFamily, { name: r.guardianName || guardian.name }));
    } catch (e) {
      setError(e instanceof Unreachable ? t.cannotReach : e instanceof Error ? e.message : t.cannotReach);
    } finally {
      setAsking(false);
    }
  }

  const look = verdict ? c.shield[verdict.level] : null;

  return (
    <View style={s.page}>
      <Header title={t.isThisSafe} onBack={onBack} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scroll} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
          <TextInput
            value={text}
            onChangeText={reset}
            placeholder={t.pasteHere}
            placeholderTextColor={c.inkMuted}
            multiline
            textAlignVertical="top"
            maxLength={2000}
            accessibilityLabel={t.pasteHere}
            keyboardAppearance={c.scheme}
            style={[s.input, { fontSize: fs.body }]}
          />
          <View style={s.row}>
            <Button
              label={t.paste}
              icon="clipboard-outline"
              tone="quiet"
              style={{ flex: 1 }}
              onPress={() => void Clipboard.getStringAsync().then((v) => v && reset(v))}
            />
            {text ? (
              <Button label={t.clear} icon="close" tone="quiet" style={{ flex: 1 }} onPress={() => reset('')} />
            ) : (
              <Button label={t.example} icon="bulb-outline" tone="quiet" style={{ flex: 1 }} onPress={() => reset(EXAMPLE_SCAM)} />
            )}
          </View>
          <Button
            label={checking ? t.checking : t.check}
            icon="shield-checkmark"
            busy={checking}
            disabled={!text.trim()}
            onPress={() => void check()}
          />

          {error && (
            <Text style={[s.error, { fontSize: fs.body }]} accessibilityRole="alert">
              {error}
            </Text>
          )}

          {verdict && look && (
            <Card style={[s.verdict, { backgroundColor: look.bg, borderColor: look.line }]}>
              <View style={s.verdictHead} accessible accessibilityRole="alert">
                <Ionicons name={ICON[verdict.level]} size={fs.hero} color={look.line} />
                <Text style={[s.verdictTitle, { color: look.ink, fontSize: fs.title }]}>{verdict.title}</Text>
              </View>
              {verdict.advice.map((line) => (
                <View key={line} style={s.adviceRow}>
                  <View style={[s.dot, { backgroundColor: look.line }]} />
                  <Text style={[s.advice, { color: look.ink, fontSize: fs.large, lineHeight: fs.large * 1.4 }]}>{line}</Text>
                </View>
              ))}
              <Button
                label={speaking ? t.stop : t.readAloud}
                icon={speaking ? 'stop-circle' : 'volume-high'}
                tone="quiet"
                onPress={() => (speaking ? void Speech.stop() : speak(verdict))}
              />
              {verdict.level !== 'safe' &&
                (asked ? (
                  <Text style={[s.asked, { fontSize: fs.body }]} accessibilityRole="alert">
                    {asked}
                  </Text>
                ) : guardian ? (
                  <Button
                    label={fill(t.askFamily, { name: guardian.name })}
                    icon="people"
                    tone={verdict.level === 'danger' ? 'danger' : 'primary'}
                    busy={asking}
                    onPress={() => void ask()}
                  />
                ) : (
                  <Text style={{ color: look.ink, fontSize: fs.small }}>{t.askInChat}</Text>
                ))}
            </Card>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: c.canvas },
    body: { padding: 20, gap: 14, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center' },
    input: {
      minHeight: 170,
      borderRadius: radius.card,
      borderWidth: 1.5,
      borderColor: c.lineStrong,
      backgroundColor: c.surface,
      padding: 18,
      color: c.ink,
    },
    row: { flexDirection: 'row', gap: 12 },
    error: { color: c.danger, fontWeight: '700', textAlign: 'center' },
    verdict: { gap: 14, borderWidth: 1.5, marginTop: 6 },
    verdictHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    verdictTitle: { flex: 1, fontWeight: '800' },
    adviceRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    dot: { width: 10, height: 10, borderRadius: 5, marginTop: 12 },
    advice: { flex: 1 },
    asked: { color: c.success, fontWeight: '700' },
  });
