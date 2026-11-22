// Aangan design tokens, the same as the website (web/src/index.css):
// dark = the night courtyard (navy, marigold for actions, jade for "online"),
// light = warm cream. The app follows the phone's Light/Dark setting.

import { useColorScheme } from 'react-native';

export interface Palette {
  scheme: 'light' | 'dark';
  canvas: string; // screen background
  stage: string; // a shade deeper: chat, hero
  surface: string; // cards, rows, inputs
  elevated: string;
  fill: string; // quiet fills
  line: string;
  lineStrong: string;
  ink: string;
  inkMuted: string;
  accent: string; // marigold fill, dark text on it
  accentTop: string; // gradient top
  accentBottom: string; // gradient bottom
  accentInk: string; // marigold text and links
  accentSoft: string; // selected rows
  onAccent: string; // text and icons on marigold
  success: string;
  dangerFill: string;
  danger: string;
  glow: string; // warm glow at the top of screens
  shield: Record<'safe' | 'caution' | 'danger', { ink: string; bg: string; line: string }>;
}

const light: Palette = {
  scheme: 'light',
  canvas: '#fbf3e6',
  stage: '#fffaf1',
  surface: '#ffffff',
  elevated: '#fffdf8',
  fill: '#f4e9d8',
  line: '#eadfcb',
  lineStrong: '#9a8566',
  ink: '#20170b',
  inkMuted: '#6b5638',
  accent: '#ffb23f',
  accentTop: '#ffc35f',
  accentBottom: '#f08a1c',
  accentInk: '#9a4a0b',
  accentSoft: '#ffefd4',
  onAccent: '#1b1103',
  success: '#0f7a60',
  dangerFill: '#d70015',
  danger: '#b00012',
  glow: 'rgba(255,178,63,0.16)',
  shield: {
    danger: { ink: '#6e1a10', bg: '#fdecea', line: '#d70015' },
    caution: { ink: '#5c3d06', bg: '#fff4d6', line: '#c27c00' },
    safe: { ink: '#14532a', bg: '#e6f6ea', line: '#1e7b34' },
  },
};

const dark: Palette = {
  scheme: 'dark',
  canvas: '#0b1222',
  stage: '#080e1b',
  surface: '#0f1830',
  elevated: '#142041',
  fill: '#1a2647',
  line: 'rgba(160,184,255,0.16)',
  lineStrong: 'rgba(160,184,255,0.5)',
  ink: '#eef2fb',
  inkMuted: '#aab4cf',
  accent: '#ffb23f',
  accentTop: '#ffc35f',
  accentBottom: '#f08a1c',
  accentInk: '#ffc35f',
  accentSoft: 'rgba(255,178,63,0.12)',
  onAccent: '#1b1103',
  success: '#3fe3c0',
  dangerFill: '#d70015',
  danger: '#ff8a94',
  glow: 'rgba(255,178,63,0.10)',
  shield: {
    danger: { ink: '#ffd2cc', bg: '#3a1414', line: '#ff6961' },
    caution: { ink: '#ffe2a8', bg: '#33270b', line: '#ff9f0a' },
    safe: { ink: '#b8f0c6', bg: '#0f2a17', line: '#30d158' },
  },
};

/** Brand colours that do not change with the theme. */
export const brand = { marigold: '#ffb23f', marigoldDeep: '#f08a1c', ember: '#ff7a3d', jade: '#3fe3c0', night: '#060a13', white: '#ffffff' };

/** Avatar colours, as on the website. */
export const AVATAR = { dadi: '#a2471a', arjun: '#2f5bd3' };

export function useTheme(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

export type TextStep = 0 | 1 | 2;

const SCALE: Record<TextStep, number> = { 0: 1, 1: 1.15, 2: 1.3 };

/** Font sizes for the reader's chosen text size. Nothing is smaller than 17. */
export function sizes(step: TextStep) {
  const s = SCALE[step];
  return {
    small: Math.round(17 * s),
    body: Math.round(20 * s),
    large: Math.round(24 * s),
    title: Math.round(30 * s),
    hero: Math.round(36 * s),
  };
}

/** The landing page's display face, for the wordmark and big headings. */
export const DISPLAY = 'Unbounded_700Bold';

export const radius = { card: 18, button: 16 };

/** Minimum tap target for elders. */
export const TAP = 64;
