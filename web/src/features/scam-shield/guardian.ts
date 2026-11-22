// The trusted family member who gets "Ask my family" messages. Per user, in
// this browser. Small interface so it can move to the server later.

export interface Guardian {
  userId: string;
  name: string;
}

const keyFor = (userId: string) => `aangan.guardian.${userId}`;

export function loadGuardian(userId: string): Guardian | null {
  try {
    const v = JSON.parse(localStorage.getItem(keyFor(userId)) ?? 'null') as Partial<Guardian> | null;
    return v && typeof v.userId === 'string' && typeof v.name === 'string' ? { userId: v.userId, name: v.name } : null;
  } catch {
    return null;
  }
}

export function saveGuardian(userId: string, g: Guardian): void {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(g));
  } catch {
    // storage blocked: they will simply be asked again next time
  }
}
