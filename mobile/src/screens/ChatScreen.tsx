import { createElement, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import type { Session } from '../api';
import { API_URL } from '../config';
import { useApp, type Prefs } from '../state';
import { useTheme } from '../theme';
import { Button, Header } from '../ui';

// The family chat is the website's chat, shown inside the app. Nexconn has no
// React Native SDK, and the website already has live messages, translation,
// scam warnings and "What did I miss?". We hand it the session we already have,
// so the reader does not sign in twice.

/** Runs before the website loads: the app's theme, and (for a signed-in user) the session. */
function themeScript(scheme: 'light' | 'dark'): string {
  return `try { localStorage.setItem('aangan.theme', '${scheme}'); } catch (e) {}
`;
}

/** Saves the session where the website looks for it, so the reader does not sign in twice. */
function sessionScript(session: Session, prefs: Prefs): string {
  const { persona: _p, mode: _m, language: _l, ...web } = session;
  const reader = { mode: prefs.mode, textStep: prefs.textStep, language: prefs.language };
  return `(function () {
  try {
    var s = ${JSON.stringify(web)};
    var all = JSON.parse(localStorage.getItem('aangan.sessions') || '{}');
    all[s.userId] = s;
    localStorage.setItem('aangan.sessions', JSON.stringify(all));
    sessionStorage.setItem('aangan.tabUserId', s.userId);
    localStorage.setItem('aangan.reader.' + s.userId, ${JSON.stringify(JSON.stringify(reader))});
  } catch (e) {}
})();
true;`;
}

export function ChatScreen({ onBack }: { onBack: () => void }) {
  const { t, fs, session, prefs } = useApp();
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  // Demo family: the showcase page signs in as that persona by itself.
  const uri = session?.persona ? `${API_URL}/showcase/phone?persona=${session.persona}` : `${API_URL}/?start=1`;
  const script = useMemo(
    () => themeScript(c.scheme) + (session && !session.persona ? sessionScript(session, prefs) : 'true;'),
    [session, prefs, c.scheme],
  );

  // Links to other sites open in Safari, not inside the family chat.
  function onNavigate(req: WebViewNavigation & { isTopFrame?: boolean }): boolean {
    if (req.url.startsWith(API_URL) || req.url.startsWith('about:') || req.isTopFrame === false) return true;
    void Linking.openURL(req.url);
    return false;
  }

  return (
    <View style={[s.page, { paddingBottom: insets.bottom, backgroundColor: c.stage }]}>
      <Header title={t.familyChat} onBack={onBack} />
      {failed ? (
        <View style={[s.center, { backgroundColor: c.stage }]}>
          <Text style={[s.message, { color: c.ink, fontSize: fs.body }]}>{t.cannotReach}</Text>
          <Button
            label={t.tryAgain}
            icon="refresh"
            onPress={() => {
              setFailed(false);
              setLoading(true);
              setAttempt((n) => n + 1);
            }}
          />
        </View>
      ) : Platform.OS === 'web' ? (
        // Browser preview only (the phone uses the WebView below).
        createElement('iframe', { src: uri, style: { flex: 1, border: 0, width: '100%', height: '100%' } })
      ) : (
        <View style={{ flex: 1 }}>
          <WebView
            key={attempt}
            source={{ uri }}
            injectedJavaScriptBeforeContentLoaded={script}
            onShouldStartLoadWithRequest={onNavigate}
            onLoadEnd={() => setLoading(false)}
            onError={() => setFailed(true)}
            onHttpError={(e) => e.nativeEvent.statusCode >= 500 && setFailed(true)}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            allowsBackForwardNavigationGestures={false}
            contentInsetAdjustmentBehavior="never"
            keyboardDisplayRequiresUserAction={false}
            webviewDebuggingEnabled
            style={{ backgroundColor: c.stage }}
          />
          {loading && (
            <View style={[StyleSheet.absoluteFill, s.center, { backgroundColor: c.stage }]} pointerEvents="none">
              <ActivityIndicator size="large" color={c.accent} />
              <Text style={[s.message, { color: c.ink, fontSize: fs.body }]}>{t.opening}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 },
  message: { textAlign: 'center', fontWeight: '600' },
});
