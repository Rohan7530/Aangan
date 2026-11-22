import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { demoSession, login, Unreachable, type DemoPersona } from '../api';
import { useApp } from '../state';
import { AVATAR, brand, radius, TAP, useTheme, type Palette } from '../theme';
import { Button, Glow, pressedStyle, useStyles, Wordmark } from '../ui';

// Sign in with a name (joins the real family room), or open the demo family.
export function WelcomeScreen() {
  const { t, fs, signIn } = useApp();
  const c = useTheme();
  const s = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState<'join' | DemoPersona | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: 'join' | DemoPersona) {
    if (kind === 'join' && !name.trim()) {
      setError(t.nameNeeded);
      return;
    }
    setBusy(kind);
    setError(null);
    try {
      signIn(kind === 'join' ? await login(name.trim()) : await demoSession(kind));
    } catch (e) {
      setError(e instanceof Unreachable ? t.cannotReach : e instanceof Error ? e.message : t.cannotReach);
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={s.screen}>
      <Glow />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[s.page, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Wordmark size={52} />
          <Text style={[s.tagline, { fontSize: fs.body }]}>{t.tagline}</Text>

          <View style={s.form}>
            <Text style={[s.label, { fontSize: fs.body }]}>{t.yourName}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Kamla"
              placeholderTextColor={c.inkMuted}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={() => void run('join')}
              maxLength={64}
              accessibilityLabel={t.yourName}
              keyboardAppearance={c.scheme}
              style={[s.input, { fontSize: fs.large }]}
            />
            <Button label={t.join} icon="people" onPress={() => void run('join')} busy={busy === 'join'} disabled={!!busy} />
          </View>

          {error && (
            <Text style={[s.error, { fontSize: fs.body }]} accessibilityRole="alert">
              {error}
            </Text>
          )}

          <View style={s.dividerRow}>
            <View style={s.divider} />
            <Text style={[s.muted, { fontSize: fs.small }]}>{t.orDemo}</Text>
            <View style={s.divider} />
          </View>

          <Persona label="Dadi" desc={t.dadiDesc} color={AVATAR.dadi} busy={busy === 'dadi'} disabled={!!busy} onPress={() => void run('dadi')} />
          <Persona label="Arjun" desc={t.arjunDesc} color={AVATAR.arjun} busy={busy === 'arjun'} disabled={!!busy} onPress={() => void run('arjun')} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Persona(props: { label: string; desc: string; color: string; busy: boolean; disabled: boolean; onPress: () => void }) {
  const { fs } = useApp();
  const c = useTheme();
  const s = useStyles(makeStyles);
  return (
    <Pressable
      onPress={props.onPress}
      disabled={props.disabled}
      accessibilityRole="button"
      accessibilityLabel={props.desc}
      style={({ pressed }) => [s.persona, props.disabled && !props.busy && { opacity: 0.55 }, pressed && pressedStyle]}
    >
      <View style={[s.avatar, { backgroundColor: props.color }]}>
        <Text style={[s.avatarText, { fontSize: fs.large }]}>{props.label[0]}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.ink, fontWeight: '800', fontSize: fs.large }}>{props.label}</Text>
        <Text style={[s.muted, { fontSize: fs.small }]}>{props.desc}</Text>
      </View>
      <Ionicons name={props.busy ? 'hourglass-outline' : 'arrow-forward-circle'} size={38} color={c.accent} />
    </Pressable>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.canvas },
    page: { paddingHorizontal: 24, alignItems: 'center', gap: 12, maxWidth: 560, width: '100%', alignSelf: 'center' },
    tagline: { color: c.inkMuted, textAlign: 'center', marginTop: 12, marginBottom: 24 },
    form: { width: '100%', gap: 12 },
    label: { color: c.ink, fontWeight: '700' },
    input: {
      minHeight: TAP,
      borderRadius: radius.button,
      borderWidth: 1.5,
      borderColor: c.lineStrong,
      backgroundColor: c.surface,
      paddingHorizontal: 18,
      color: c.ink,
    },
    error: { color: c.danger, fontWeight: '700', textAlign: 'center', marginTop: 4 },
    dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%', marginTop: 28, marginBottom: 4 },
    divider: { flex: 1, height: 1, backgroundColor: c.line },
    muted: { color: c.inkMuted },
    persona: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      minHeight: 96,
      padding: 16,
      borderRadius: radius.card,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
    },
    avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: brand.white, fontWeight: '800' },
  });
