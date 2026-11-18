// The demo family. User IDs are letters and digits only, as Nexconn requires.

export type PersonaKey = 'dadi' | 'papa' | 'meera' | 'arjun';

export interface Persona {
  key: PersonaKey;
  name: string;
  /** Shown on the showcase page, e.g. "Dadi, 71". */
  label: string;
  /** Reading mode the showcase opens this persona in. */
  mode: 'standard' | 'comfort';
  /** Language this persona reads in. */
  language: 'en' | 'hi';
}

export const PERSONAS: Record<PersonaKey, Persona> = {
  dadi: { key: 'dadi', name: 'Dadi', label: 'Dadi, 71', mode: 'comfort', language: 'hi' },
  papa: { key: 'papa', name: 'Papa', label: 'Papa, 49', mode: 'standard', language: 'en' },
  meera: { key: 'meera', name: 'Meera', label: 'Meera, 27', mode: 'standard', language: 'en' },
  arjun: { key: 'arjun', name: 'Arjun', label: 'Arjun, 24', mode: 'standard', language: 'en' },
};

// Persona user IDs are scoped to the demo room, so the real showcase and each
// test run have separate demo families (and separate room lists).
export function personaUserId(demoChannelId: string, key: PersonaKey): string {
  return `${demoChannelId}${key}`.slice(0, 64);
}

export function isPersonaKey(v: unknown): v is PersonaKey {
  return typeof v === 'string' && v in PERSONAS;
}

export interface DemoRoomSpec {
  /** Suffix added to the base demo channel ID ('' = the main demo room). */
  suffix: string;
  name: string;
  owner: PersonaKey;
  members: PersonaKey[];
  script: { from: PersonaKey; text: string }[];
}

// Main room: a short, natural Sunday-lunch conversation, mixing English and Hindi.
// Second room: the cousins, so the showcase has more than one room (and unread badges).
export const DEMO_ROOMS: DemoRoomSpec[] = [
  {
    suffix: '',
    name: 'The Sharma Family',
    owner: 'papa',
    members: ['dadi', 'papa', 'meera', 'arjun'],
    script: [
      { from: 'papa', text: 'Good morning, everyone! Sunday lunch at our place this week?' },
      { from: 'dadi', text: 'हाँ बेटा, मैं आलू के पराठे बनाऊँगी।' },
      { from: 'meera', text: 'Dadi’s parathas! I’m coming for sure 😍' },
      { from: 'arjun', text: 'Count me in. I’ll bring mangoes from the market.' },
      { from: 'papa', text: 'Arjun, can you pick Dadi up on the way? Around 12:30.' },
      { from: 'arjun', text: 'Done. Dadi, I’ll call you when I’m downstairs.' },
      { from: 'dadi', text: 'ठीक है बेटा। आराम से गाड़ी चलाना, कोई जल्दी नहीं है।' },
      { from: 'meera', text: 'Also, Dadi’s eye check-up is on Tuesday at 11. I’ll take her.' },
      { from: 'dadi', text: 'Thank you, Meera. You are all my blessings 🙏' },
      { from: 'papa', text: 'Last Sunday’s photos are printed. I’ll bring the album to lunch.' },
    ],
  },
  {
    suffix: 'cousins',
    name: 'Cousins Corner',
    owner: 'meera',
    members: ['meera', 'arjun'],
    script: [
      { from: 'meera', text: 'Dadi turns 72 next month. Surprise party?' },
      { from: 'arjun', text: 'Yes! Let’s make a photo book of all her old pictures.' },
      { from: 'meera', text: 'Perfect. Don’t tell Papa, he can’t keep a secret 😄' },
    ],
  },
];
