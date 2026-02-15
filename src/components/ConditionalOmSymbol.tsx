'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { OmSymbol } from './OmSymbol';

export function ConditionalOmSymbol() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Only show Om symbol on landing page (flash screen)
  if (!mounted) {
    return null;
  }
  
  if (pathname === '/landing') {
    return <OmSymbol />;
  }
  
  return null;
}

