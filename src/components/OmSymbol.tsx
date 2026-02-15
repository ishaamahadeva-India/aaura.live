'use client';

export function OmSymbol({ className = "fixed top-24 left-1/2 transform -translate-x-1/2 z-50 text-8xl text-red-500 select-none pointer-events-none animate-pulse" }: { className?: string }) {
  return (
    <div className={className}>
      🕉️
    </div>
  );
}
