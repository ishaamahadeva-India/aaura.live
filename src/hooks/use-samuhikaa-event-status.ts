'use client';

import { useMemo } from 'react';
import { Timestamp } from 'firebase/firestore';

export type EventStatus = 'UPCOMING' | 'LIVE' | 'COMPLETED';

export interface SamuhikaaEvent {
  id: string;
  title: string;
  mantra: string;
  description?: string;
  scheduledAt: Timestamp | Date;
  durationMinutes: number;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
  createdBy: string;
  isActive: boolean;
  showParticipantCount: boolean;
  createdAt: Timestamp | Date;
}

export function useSamuhikaaEventStatus(event: SamuhikaaEvent): {
  status: EventStatus;
  timeRemaining: number | null;
  isLive: boolean;
  hasStarted: boolean;
  hasEnded: boolean;
} {
  return useMemo(() => {
    const now = new Date();
    const scheduledAt = event.scheduledAt instanceof Timestamp 
      ? event.scheduledAt.toDate() 
      : new Date(event.scheduledAt);
    
    const durationMs = event.durationMinutes * 60 * 1000;
    const startTime = scheduledAt.getTime();
    const endTime = startTime + durationMs;
    const nowTime = now.getTime();

    const hasStarted = nowTime >= startTime;
    const hasEnded = nowTime >= endTime;

    let status: EventStatus;
    let timeRemaining: number | null = null;

    if (hasEnded) {
      status = 'COMPLETED';
    } else if (hasStarted) {
      status = 'LIVE';
      timeRemaining = Math.max(0, endTime - nowTime);
    } else {
      status = 'UPCOMING';
      timeRemaining = startTime - nowTime;
    }

    return {
      status,
      timeRemaining,
      isLive: status === 'LIVE',
      hasStarted,
      hasEnded,
    };
  }, [event]);
}

