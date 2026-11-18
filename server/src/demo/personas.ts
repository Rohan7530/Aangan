// The demo family. Fixed user IDs (letters and digits only, as Nexconn requires).

export type PersonaKey = 'dadi' | 'papa' | 'meera' | 'arjun';

export interface Persona {
  key: PersonaKey;
  userId: string;
  name: string;
  /** Shown on the showcase page, e.g. "Dadi, 71". */
  label: string;
  /** Reading mode the showcase opens this persona in. */
  mode: 'standard' | 'comfort';
}

export const PERSONAS: Record<PersonaKey, Persona> = {
  dadi: { key: 'dadi', userId: 'aangandemodadi', name: 'Dadi', label: 'Dadi, 71', mode: 'comfort' },
  papa: { key: 'papa', userId: 'aangandemopapa', name: 'Papa', label: 'Papa, 49', mode: 'standard' },
  meera: { key: 'meera', userId: 'aangandemomeera', name: 'Meera', label: 'Meera, 27', mode: 'standard' },
  arjun: { key: 'arjun', userId: 'aangandemoarjun', name: 'Arjun', label: 'Arjun, 24', mode: 'standard' },
};

export function isPersonaKey(v: unknown): v is PersonaKey {
  return typeof v === 'string' && v in PERSONAS;
}

// A short, natural Sunday-lunch conversation, mixing English and Hindi.
export const SEED_SCRIPT: { from: PersonaKey; text: string }[] = [
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
];
