'use client';

import { useMemo } from 'react';
import { useFirestore } from '@/lib/firebase/provider';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, Timestamp } from 'firebase/firestore';

/**
 * Hook to get the count of active events (contests + Samuhikaa)
 */
export function useActiveEventsCount() {
  const db = useFirestore();

  // Fetch active contests
  const contestsQuery = useMemo(() => {
    if (!db) return null;
    try {
      return query(
        collection(db, 'contests'),
        where('isActive', '==', true)
      );
    } catch {
      return collection(db, 'contests');
    }
  }, [db]);

  const [contestsSnapshot] = useCollection(contestsQuery);

  // Fetch active Samuhikaa events
  const samuhikaaQuery = useMemo(() => {
    if (!db) return null;
    try {
      return query(
        collection(db, 'samuhikaa_events'),
        where('isActive', '==', true)
      );
    } catch {
      return collection(db, 'samuhikaa_events');
    }
  }, [db]);

  const [samuhikaaSnapshot] = useCollection(samuhikaaQuery);

  // Count active events
  const count = useMemo(() => {
    let total = 0;
    const now = new Date();

    // Count active contests
    if (contestsSnapshot) {
      contestsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const startDate = data.startDate?.toDate?.() || data.startDate;
        const endDate = data.endDate?.toDate?.() || data.endDate;
        
        if (startDate && startDate instanceof Date) {
          const endTime = endDate?.getTime() || startDate.getTime() + (7 * 24 * 60 * 60 * 1000);
          if (endTime > now.getTime()) {
            total++;
          }
        }
      });
    }

    // Count active Samuhikaa events
    if (samuhikaaSnapshot) {
      samuhikaaSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const scheduledAt = data.scheduledAt instanceof Timestamp
          ? data.scheduledAt.toDate()
          : data.scheduledAt instanceof Date
          ? data.scheduledAt
          : new Date(data.scheduledAt);
        
        if (scheduledAt && !isNaN(scheduledAt.getTime())) {
          const durationMs = (data.durationMinutes || 5) * 60 * 1000;
          const endTime = scheduledAt.getTime() + durationMs;
          if (endTime > now.getTime()) {
            total++;
          }
        }
      });
    }

    return total;
  }, [contestsSnapshot, samuhikaaSnapshot]);

  return count;
}

