// The "nexconn" translation engine: Nexconn built-in translation (Console:
// Chat > Chat settings > Messages > Translation). Part of the Nexconn layer.
// Docs: /chatsdk-web/builtin-translation/*. Verified live (see README notes):
//   NCEngine.translateModule.translateMessages({ list: TranslateMessageParam[] })  (max 10 per call)
//   results arrive later via TranslateHandler.onTranslationCompleted

import { NCEngine, TranslateHandler, TranslateMessageParam } from '@nexconn/chat';

type Waiter = { target: string; resolve: (text: string) => void; reject: (e: Error) => void; timer: number };
const waiters = new Map<string, Waiter[]>(); // messageId -> pending requests
let registered = false;

function ensureHandler() {
  if (registered) return;
  registered = true;
  NCEngine.addTranslateHandler(
    'aangan-translate',
    new TranslateHandler({
      onTranslationCompleted({ results }) {
        for (const r of results) {
          const list = waiters.get(r.identifier);
          if (!list?.length) continue;
          const lang = r.translateInfo?.targetLanguage;
          const i = Math.max(0, list.findIndex((w) => w.target === lang));
          const [w] = list.splice(i, 1);
          if (!list.length) waiters.delete(r.identifier);
          window.clearTimeout(w.timer);
          const text = r.translateInfo?.translatedText;
          if (r.code === 0 && text) w.resolve(text);
          else w.reject(new Error(`Nexconn translation failed (code ${r.code})`));
        }
      },
    }),
  );
}

// Translate one message's text into `target` (e.g. 'hi'). Resolves with the text.
export function nexconnTranslate(messageId: string, text: string, target: string): Promise<string> {
  ensureHandler();
  return new Promise<string>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      const list = waiters.get(messageId) ?? [];
      const i = list.findIndex((w) => w.timer === timer);
      if (i >= 0) list.splice(i, 1);
      reject(new Error('Nexconn translation timed out'));
    }, 30_000);
    const list = waiters.get(messageId) ?? [];
    list.push({ target, resolve, reject, timer });
    waiters.set(messageId, list);
    NCEngine.translateModule
      .translateMessages({ list: [new TranslateMessageParam(messageId, 'auto', target, text)], force: false })
      .then((res) => {
        if (!res.isOk) {
          window.clearTimeout(timer);
          const l = waiters.get(messageId) ?? [];
          const j = l.findIndex((w) => w.timer === timer);
          if (j >= 0) l.splice(j, 1);
          reject(new Error(`Nexconn translation refused (code ${res.code})`));
        }
      })
      .catch(reject);
  });
}
