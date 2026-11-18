// Reader view: each member chooses how they read (Standard or Comfort, three
// text sizes, read-aloud). Public surface of the feature.
export { ReaderPrefsProvider, useReaderPrefs } from './ReaderPrefsContext';
export { ReaderSettingsSheet } from './ReaderSettingsSheet';
export { ComfortMessage } from './ComfortMessage';
export { useSpeech, type Speech } from './useSpeech';
export {
  DEFAULT_READER_PREFS,
  localReaderPrefsStore,
  memoryReaderPrefsStore,
  type ReaderMode,
  type ReaderPrefs,
  type ReaderPrefsStore,
  type TextStep,
} from './prefs';
export { useTranslations, type TranslationState } from './useTranslations';
export { LANGUAGES, getEngine, sourceName, speechLang, translate, type Engine, type Lang, type Translation } from './translation';
