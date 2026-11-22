// Shared building blocks: large, calm, easy to tap, in the website's night/cream look.

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, type ComponentProps, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from './state';
import { brand, DISPLAY, radius, TAP, useTheme, type Palette } from './theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/** Styles that depend on the theme, rebuilt only when the theme changes. */
export function useStyles<T>(make: (c: Palette) => T): T {
  const c = useTheme();
  return useMemo(() => make(c), [c, make]);
}

/** The Aangan mark, as on the website: a marigold-to-jade tile with a night courtyard and a sun. */
export function BrandMark({ size = 56 }: { size?: number }) {
  const r = size * 0.28;
  return (
    <LinearGradient
      colors={[brand.marigold, brand.ember, brand.jade]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: r, padding: size * 0.16 }}
    >
      <View style={{ flex: 1, borderRadius: r * 0.6, backgroundColor: brand.night, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: size * 0.26, height: size * 0.26, borderRadius: size * 0.06, backgroundColor: brand.marigold }} />
      </View>
    </LinearGradient>
  );
}

/** Wordmark: the mark plus "Aangan" in the display face. */
export function Wordmark({ size = 40 }: { size?: number }) {
  const c = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.3 }} accessibilityRole="header" accessibilityLabel="Aangan">
      <BrandMark size={size} />
      <Text style={{ fontFamily: DISPLAY, fontSize: size * 0.62, color: c.ink, letterSpacing: -0.5 }}>Aangan</Text>
    </View>
  );
}

/** A soft marigold glow at the top of a screen, like the website's sidebar. */
export function Glow() {
  const c = useTheme();
  return (
    <LinearGradient
      colors={[c.glow, 'transparent']}
      style={[StyleSheet.absoluteFill, { height: 320 }]}
      pointerEvents="none"
    />
  );
}

/** Top bar with a big Back button and the screen title. */
export function Header({ title, onBack }: { title: string; onBack?: () => void }) {
  const { t, fs } = useApp();
  const c = useTheme();
  const s = useStyles(headerStyles);
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.header, { paddingTop: insets.top + 8 }]}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={t.back}
          hitSlop={8}
          style={({ pressed }) => [s.back, pressed && pressedStyle]}
        >
          <Ionicons name="chevron-back" size={28} color={c.accentInk} />
          <Text style={[s.backText, { fontSize: fs.body }]}>{t.back}</Text>
        </Pressable>
      ) : (
        <BrandMark size={40} />
      )}
      <Text
        style={[s.title, { fontSize: fs.large }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        accessibilityRole="header"
      >
        {title}
      </Text>
    </View>
  );
}

const headerStyles = (c: Palette) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingBottom: 12,
      backgroundColor: c.canvas,
      borderBottomWidth: 1,
      borderBottomColor: c.line,
    },
    back: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingRight: 14, borderRadius: 999 },
    backText: { color: c.accentInk, fontWeight: '700' },
    title: { flex: 1, color: c.ink, fontWeight: '800', textAlign: 'right' },
  });

type Tone = 'primary' | 'quiet' | 'danger';

/** Primary = the website's marigold button (dark text on a marigold gradient). */
export function Button({
  label,
  onPress,
  icon,
  tone = 'primary',
  busy = false,
  disabled = false,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  tone?: Tone;
  busy?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { fs } = useApp();
  const c = useTheme();
  const fg = tone === 'primary' ? c.onAccent : tone === 'danger' ? brand.white : c.ink;
  const inner = (
    <>
      {busy ? <ActivityIndicator color={fg} /> : icon ? <Ionicons name={icon} size={fs.large} color={fg} /> : null}
      <Text style={[shared.buttonText, { color: fg, fontSize: fs.body }]}>{label}</Text>
    </>
  );
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      style={({ pressed }) => [
        shared.buttonWrap,
        tone === 'primary' && shared.primaryShadow,
        (disabled || busy) && { opacity: 0.55 },
        pressed && pressedStyle,
        style,
      ]}
    >
      {tone === 'primary' ? (
        <LinearGradient colors={[c.accentTop, c.accentBottom]} style={shared.button}>
          {inner}
        </LinearGradient>
      ) : (
        <View
          style={[
            shared.button,
            tone === 'danger' ? { backgroundColor: c.dangerFill } : { backgroundColor: c.surface, borderWidth: 1.5, borderColor: c.line },
          ]}
        >
          {inner}
        </View>
      )}
    </Pressable>
  );
}

/** A big row on the Home screen. `featured` = the marigold call to action. */
export function Tile({
  title,
  subtitle,
  icon,
  featured = false,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: IconName;
  featured?: boolean;
  onPress: () => void;
}) {
  const { fs } = useApp();
  const c = useTheme();
  const fg = featured ? c.onAccent : c.ink;
  const body = (
    <>
      <View style={[shared.tileIcon, { backgroundColor: featured ? 'rgba(27,17,3,0.12)' : c.accent }]}>
        <Ionicons name={icon} size={32} color={c.onAccent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: fg, fontWeight: '800', fontSize: fs.large }}>{title}</Text>
        <Text style={{ color: featured ? c.onAccent : c.inkMuted, opacity: featured ? 0.85 : 1, fontSize: fs.small }}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={28} color={featured ? c.onAccent : c.lineStrong} />
    </>
  );
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      style={({ pressed }) => [featured && shared.primaryShadow, pressed && pressedStyle]}
    >
      {featured ? (
        <LinearGradient colors={[c.accentTop, c.accentBottom]} style={shared.tile}>
          {body}
        </LinearGradient>
      ) : (
        <View style={[shared.tile, { backgroundColor: c.surface, borderWidth: 1, borderColor: c.line }]}>{body}</View>
      )}
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useTheme();
  return <View style={[shared.card, { backgroundColor: c.surface, borderColor: c.line }, style]}>{children}</View>;
}

export const pressedStyle: ViewStyle = { opacity: 0.85, transform: [{ scale: 0.98 }] };

const shared = StyleSheet.create({
  buttonWrap: { borderRadius: radius.button },
  button: {
    minHeight: TAP,
    borderRadius: radius.button,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryShadow: {
    shadowColor: '#f08a1c',
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  buttonText: { fontWeight: '800' },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    minHeight: 108,
    padding: 18,
    borderRadius: radius.card,
  },
  tileIcon: { width: 60, height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: radius.card, borderWidth: 1, padding: 20 },
});
