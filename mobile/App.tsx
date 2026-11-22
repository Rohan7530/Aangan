import { Unbounded_700Bold, useFonts } from '@expo-google-fonts/unbounded';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ChatScreen } from './src/screens/ChatScreen';
import { HomeScreen, type Route } from './src/screens/HomeScreen';
import { SafeCheckScreen } from './src/screens/SafeCheckScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { AppStateProvider, useApp } from './src/state';
import { useTheme } from './src/theme';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <Screens />
      </AppStateProvider>
    </SafeAreaProvider>
  );
}

// Four screens and one level of depth: Home, and a big Back button everywhere else.
function Screens() {
  const { ready, session } = useApp();
  const c = useTheme();
  // The display face for the wordmark; if it cannot load, the system font is used.
  const [fontsLoaded, fontError] = useFonts({ Unbounded_700Bold });
  const fontsReady = fontsLoaded || !!fontError;
  const [route, setRoute] = useState<Route>('home');
  const home = () => setRoute('home');

  useEffect(() => {
    if (!session) setRoute('home');
  }, [session]);

  // Android back button goes Home first.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (route === 'home') return false;
      setRoute('home');
      return true;
    });
    return () => sub.remove();
  }, [route]);

  return (
    <View style={{ flex: 1, backgroundColor: c.canvas }}>
      <StatusBar style={c.scheme === 'dark' ? 'light' : 'dark'} />
      {!ready || !fontsReady ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={c.accent} />
        </View>
      ) : !session ? (
        <WelcomeScreen />
      ) : route === 'chat' ? (
        <ChatScreen onBack={home} />
      ) : route === 'safe' ? (
        <SafeCheckScreen onBack={home} />
      ) : route === 'settings' ? (
        <SettingsScreen onBack={home} />
      ) : (
        <HomeScreen go={setRoute} />
      )}
    </View>
  );
}
