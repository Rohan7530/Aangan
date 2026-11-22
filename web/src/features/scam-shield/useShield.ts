import { useEffect, useRef, useState } from 'react';
import { shieldScan, type ReaderLang, type ShieldVerdict } from '../../api';
import type { RichMessage } from '../../nexconn/rich';

const CONCURRENCY = 2;
// Messages that are obviously chit-chat are not sent for checking at all.
const WORTH_CHECKING = /(https?:\/\/|www\.|\.apk|\b\d{4,}\b|₹|rs\.?\s?\d|lakh|otp|pin|kyc|bank|account|police|cbi|arrest|court|lottery|prize|won|urgent|immediately|click|link|pay|upi|money|send|help|gift|parcel|courier|customs|electricity|bijli|job|earn|invest|crypto|double|accident|hospital|trouble|new number|video call|anydesk|teamviewer|paisa|paise|rupay|पैसे|रुपये|खाता|बैंक|पुलिस|गिरफ़्तार|गिरफ्तार|इनाम|लॉटरी|तुरंत|लिंक|ओटीपी|पिन|अस्पताल|मदद|भेजो|भेजें|बिजली|अटक|बक्षीस|पोलीस)/i;

/**
 * Checks other people's messages for scams, once per message and language.
 * Only "caution" and "danger" results get an entry, so safe messages stay plain.
 * If the check is unavailable the message is simply shown as it is.
 */
export function useShield(messages: RichMessage[], myUserId: string, lang: ReaderLang, authKey: string) {
  const [verdicts, setVerdicts] = useState<Map<string, ShieldVerdict>>(() => new Map());
  const started = useRef(new Set<string>());
  const langRef = useRef(lang);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    langRef.current = lang;
    started.current = new Set();
    setVerdicts(new Map());
  }, [lang]);

  useEffect(() => {
    const todo = messages.filter(
      (m) => m.senderId !== myUserId && m.text && m.kind !== 'image' && !started.current.has(m.id) && WORTH_CHECKING.test(m.text),
    );
    if (!todo.length) return;
    todo.forEach((m) => started.current.add(m.id));
    const queue = [...todo].reverse(); // newest first
    const forLang = lang;
    const worker = async () => {
      for (let m = queue.shift(); m && alive.current; m = queue.shift()) {
        try {
          const v = await shieldScan(authKey, m.text, forLang);
          if (v.level !== 'safe' && langRef.current === forLang) {
            const id = m.id;
            setVerdicts((prev) => new Map(prev).set(id, v));
          }
        } catch {
          // unavailable: no warning, the message shows as normal
        }
      }
    };
    // Not cancelled when new messages arrive: work already queued finishes.
    void Promise.all(Array.from({ length: CONCURRENCY }, worker));
  }, [messages, myUserId, lang, authKey]);

  return verdicts;
}
