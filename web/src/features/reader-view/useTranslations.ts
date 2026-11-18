import { useEffect, useRef, useState } from 'react';
import type { RichMessage } from '../../nexconn/rich';
import { getEngine, planFor, translate, type Engine, type Lang, type Translation } from './translation';

export type TranslationState =
  | { status: 'pending' }
  | ({ status: 'done' } & Translation)
  | { status: 'unavailable'; engine: Engine };

const CONCURRENCY = 3;
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

// Translates other people's messages into the reader's language, on arrival
// and for history. Messages that need no translation get no entry.
export function useTranslations(messages: RichMessage[], myUserId: string, language: Lang, authKey: string) {
  const [states, setStates] = useState<Map<string, TranslationState>>(() => new Map());
  const started = useRef(new Set<string>());
  const langRef = useRef(language);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // A new language starts over.
  useEffect(() => {
    langRef.current = language;
    started.current = new Set();
    setStates(new Map());
  }, [language]);

  // New messages only add work: results already in flight are kept (they are
  // dropped only if the reader changes language or leaves the room).
  useEffect(() => {
    const todo = messages.filter(
      (m) => m.senderId !== myUserId && (m.kind === 'text' || m.kind === 'reply' || m.kind === 'voice') && m.text && !started.current.has(m.id),
    );
    if (!todo.length) return;
    todo.forEach((m) => started.current.add(m.id));
    const lang = language;

    (async () => {
      const engine = await getEngine();
      const set = (id: string, s: TranslationState | null) =>
        alive.current &&
        langRef.current === lang &&
        setStates((prev) => {
          const next = new Map(prev);
          if (s) next.set(id, s);
          else next.delete(id);
          return next;
        });

      const queue: RichMessage[] = [];
      for (const m of todo) {
        const plan = planFor(m.text, lang, engine);
        if (plan === 'unavailable') set(m.id, { status: 'unavailable', engine });
        else if (plan === 'translate') {
          set(m.id, { status: 'pending' });
          queue.push(m);
        }
      }
      // newest first, so what the reader sees translates first
      queue.reverse();
      const worker = async () => {
        for (let m = queue.shift(); m; m = queue.shift()) {
          try {
            const t = await translate(m.id, m.text, lang, authKey);
            set(m.id, same(t.translated, m.text) ? null : { status: 'done', ...t });
          } catch {
            set(m.id, { status: 'unavailable', engine });
          }
        }
      };
      await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    })();
  }, [messages, myUserId, language, authKey]);

  return states;
}
