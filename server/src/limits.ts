import { byAuthOrIp, byIp, rateLimit } from './rateLimit.js';

// Per-route limits. Generous for a family, tight enough to stop scripts from
// creating users, rooms or demo sessions in bulk, or guessing invite codes.
const MIN = 60_000;
const HOUR = 60 * MIN;

export const limits = {
  login: [
    rateLimit({ windowMs: MIN, max: 10, key: byIp, message: 'Too many sign-ins from this network.' }),
    rateLimit({ windowMs: HOUR, max: 40, key: byIp, message: 'Too many sign-ins from this network.' }),
  ],
  createRoom: [
    rateLimit({ windowMs: HOUR, max: 10, key: byAuthOrIp, message: 'You have made a lot of rooms recently.' }),
    rateLimit({ windowMs: HOUR, max: 30, key: byIp, message: 'Too many new rooms from this network.' }),
  ],
  inviteLookup: [rateLimit({ windowMs: MIN, max: 30, key: byIp, message: 'Too many invite links opened.' })],
  inviteJoin: [rateLimit({ windowMs: 10 * MIN, max: 20, key: byAuthOrIp, message: 'Too many rooms joined at once.' })],
  demoSession: [
    rateLimit({ windowMs: MIN, max: 30, key: byIp, message: 'The demo is busy from this network.' }),
    rateLimit({ windowMs: HOUR, max: 300, key: byIp, message: 'The demo is busy from this network.' }),
  ],
  translate: [
    rateLimit({ windowMs: MIN, max: 120, key: byAuthOrIp, message: 'Too many translations at once.' }),
    rateLimit({ windowMs: MIN, max: 300, key: byIp, message: 'Too many translations from this network.' }),
  ],
};
