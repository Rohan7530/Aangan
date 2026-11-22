import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../state';
import { LANGUAGES } from '../strings';
import { radius, sizes, TAP, useTheme, type Palette, type TextStep } from '../theme';
import { Button, Header, pressedStyle, useStyles } from '../ui';

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const { t, fs, prefs, setPrefs, signOut } = useApp();
  const c = useTheme();
  const s = useStyles(makeStyles);
  return (
    <View style={s.page}>
      <Header title={t.settings} onBack={onBack} />
      <ScrollView contentContainerStyle={s.body}>
        <Section title={t.language}>
          {LANGUAGES.map((l) => (
            <Choice
              key={l.code}
              selected={prefs.language === l.code}
              onPress={() => setPrefs({ language: l.code })}
              title={l.native}
              subtitle={l.native === l.english ? undefined : l.english}
            />
          ))}
        </Section>

        <Section title={t.textSize}>
          <View style={s.steps}>
            {([0, 1, 2] as TextStep[]).map((step) => (
              <Pressable
                key={step}
                onPress={() => setPrefs({ textStep: step })}
                accessibilityRole="radio"
                accessibilityState={{ selected: prefs.textStep === step }}
                accessibilityLabel={t.textSteps[step]}
                style={({ pressed }) => [s.step, prefs.textStep === step && s.selected, pressed && pressedStyle]}
              >
                <Text style={{ fontSize: sizes(step).title, fontWeight: '800', color: c.ink }}>Aa</Text>
                <Text style={[s.muted, { fontSize: fs.small }]}>{t.textSteps[step]}</Text>
              </Pressable>
            ))}
          </View>
        </Section>

        <Section title={t.readingMode}>
          <Choice selected={prefs.mode === 'comfort'} onPress={() => setPrefs({ mode: 'comfort' })} title={t.comfort} subtitle={t.comfortDesc} />
          <Choice selected={prefs.mode === 'standard'} onPress={() => setPrefs({ mode: 'standard' })} title={t.standard} subtitle={t.standardDesc} />
        </Section>

        <Button label={t.signOut} icon="log-out-outline" tone="quiet" onPress={signOut} style={{ marginTop: 12 }} />
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const { fs } = useApp();
  const s = useStyles(makeStyles);
  return (
    <View style={s.section} accessibilityRole="radiogroup" accessibilityLabel={title}>
      <Text style={[s.sectionTitle, { fontSize: fs.large }]} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Choice({ selected, onPress, title, subtitle }: { selected: boolean; onPress: () => void; title: string; subtitle?: string }) {
  const { fs } = useApp();
  const c = useTheme();
  const s = useStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={({ pressed }) => [s.choice, selected && s.selected, pressed && pressedStyle]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[s.choiceTitle, { fontSize: fs.body }]}>{title}</Text>
        {subtitle && <Text style={[s.muted, { fontSize: fs.small }]}>{subtitle}</Text>}
      </View>
      <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={32} color={selected ? c.accent : c.lineStrong} />
    </Pressable>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: c.canvas },
    body: { padding: 20, gap: 24, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center' },
    section: { gap: 10 },
    sectionTitle: { color: c.ink, fontWeight: '800' },
    muted: { color: c.inkMuted },
    choice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: TAP,
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: radius.button,
      backgroundColor: c.surface,
      borderWidth: 1.5,
      borderColor: c.line,
    },
    selected: { borderColor: c.accent, backgroundColor: c.accentSoft },
    choiceTitle: { color: c.ink, fontWeight: '700' },
    steps: { flexDirection: 'row', gap: 10 },
    step: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      minHeight: 110,
      borderRadius: radius.button,
      backgroundColor: c.surface,
      borderWidth: 1.5,
      borderColor: c.line,
    },
  });
