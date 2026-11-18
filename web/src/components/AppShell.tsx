import type { ReactNode } from 'react';

// Mobile: full screen. Desktop: a calm, phone-width column (max 480px)
// centred in the courtyard background, never a stretched full-width list.
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full items-center justify-center sm:p-6">
      <div className="relative flex h-dvh w-full max-w-[480px] flex-col overflow-hidden bg-cream sm:h-[min(920px,calc(100dvh-3rem))] sm:rounded-[32px] sm:border sm:border-line sm:shadow-[0_24px_60px_-20px_rgb(42_37_34/0.35)]">
        {children}
      </div>
    </div>
  );
}
