
'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface ClientOnlyTimeProps {
  date: Date | undefined;
  fallback?: string;
}

export function ClientOnlyTime({ date, fallback = '...' }: ClientOnlyTimeProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || !date) {
    return <span>{fallback}</span>;
  }

  return <span>{formatDistanceToNow(date, { addSuffix: true })}</span>;
}
