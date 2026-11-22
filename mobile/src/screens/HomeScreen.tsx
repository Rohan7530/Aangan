import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../state';
import { fill } from '../strings';
import { DISPLAY, type Palette } from '../theme';
import { Glow, Tile, useStyles, Wordmark } from '../ui';

export type Route = 'home' | 'chat' | 'safe' | 'settings';

export function HomeScreen({ go }: { go: (r: Route) => void }) {
  const { t, fs, session } = useApp();
  const s = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  return (
    <View style={s.screen}>
      <Glow />
      <ScrollView contentContainerStyle={[s.page, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
        <Wordmark size={40} />
        <Text style={[s.family, { fontSize: fs.small }]}>{session?.channelName}</Text>
        <Text style={[s.greeting, { fontSize: fs.hero }]} accessibilityRole="header">
          {fill(t.greeting, { name: session?.name ?? '' })}
        </Text>

        <View style={s.tiles}>
          <Tile title={t.isThisSafe} subtitle={t.isThisSafeSub} icon="shield-checkmark" featured onPress={() => go('safe')} />
          <Tile title={t.familyChat} subtitle={t.familyChatSub} icon="chatbubbles" onPress={() => go('chat')} />
          <Tile title={t.settings} subtitle={t.settingsSub} icon="text" onPress={() => go('settings')} />
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.canvas },
    page: { paddingHorizontal: 20, gap: 14, maxWidth: 640, width: '100%', alignSelf: 'center' },
    family: { color: c.inkMuted, marginTop: 18 },
    greeting: { color: c.ink, fontFamily: DISPLAY, letterSpacing: -0.5, marginBottom: 10 },
    tiles: { gap: 14 },
  });
