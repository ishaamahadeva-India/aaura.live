'use client';

import React from 'react';
import { SamuhikaaList } from '@/components/samuhikaa/SamuhikaaList';
import { SamuhikaaLiveScreen } from '@/components/samuhikaa/SamuhikaaLiveScreen';
import { useFirestore } from '@/lib/firebase/provider';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { useSamuhikaaEventStatus, type SamuhikaaEvent } from '@/hooks/use-samuhikaa-event-status';
import { useSamuhikaaAlarm } from '@/hooks/use-samuhikaa-alarm';
import { getEffectiveScheduledTime } from '@/utils/samuhikaa-recurrence';
import { Sparkles } from 'lucide-react';

export default function SamuhikaaPage() {
  const db = useFirestore();
  
  // Fetch all active events for alarm monitoring
  const allEventsQuery = React.useMemo(() => {
    if (!db) return null;
    try {
      return query(
        collection(db, 'samuhikaa_events'),
        where('isActive', '==', true)
      );
    } catch (err) {
      return collection(db, 'samuhikaa_events');
    }
  }, [db]);

  const [allEventsSnapshot] = useCollection(allEventsQuery);

  // Get all upcoming events for alarm
  const upcomingEvents: SamuhikaaEvent[] = React.useMemo(() => {
    if (!allEventsSnapshot) return [];
    const now = new Date();
    
    return allEventsSnapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          mantra: data.mantra,
          description: data.description,
          scheduledAt: data.scheduledAt,
          durationMinutes: data.durationMinutes || 5,
          recurrence: data.recurrence || 'none',
          createdBy: data.createdBy,
          isActive: data.isActive !== false,
          showParticipantCount: data.showParticipantCount !== false,
          createdAt: data.createdAt,
        } as SamuhikaaEvent;
      })
      .filter(event => {
        if (!event.scheduledAt) return false;
        
        // Get effective scheduled time (handles recurrence)
        const effectiveScheduledAt = getEffectiveScheduledTime(
          event.scheduledAt,
          event.recurrence || 'none',
          event.durationMinutes || 5
        );
        
        if (isNaN(effectiveScheduledAt.getTime())) return false;
        const durationMs = (event.durationMinutes || 5) * 60 * 1000;
        const endTime = effectiveScheduledAt.getTime() + durationMs;
        
        // Include recurring events even if current occurrence has ended
        return now.getTime() < endTime || (event.recurrence && event.recurrence !== 'none');
      });
  }, [allEventsSnapshot]);

  // Use alarm hook to play bell 1 minute before events
  useSamuhikaaAlarm(upcomingEvents);
  
  // Find live event
  const liveEventQuery = React.useMemo(() => {
    if (!db) return null;
    const now = Timestamp.now();
    return query(
      collection(db, 'samuhikaa_events'),
      where('isActive', '==', true),
      where('scheduledAt', '<=', now),
      orderBy('scheduledAt', 'desc')
    );
  }, [db]);

  const [liveSnapshot] = useCollection(liveEventQuery);

  // Check if any event is currently live
  const liveEvent = React.useMemo(() => {
    if (!liveSnapshot) return null;
    
    const now = new Date();
    for (const docSnap of liveSnapshot.docs) {
      const data = docSnap.data();
      const originalScheduledAt = data.scheduledAt?.toDate?.() || new Date(data.scheduledAt);
      
      // Get effective scheduled time (handles recurrence)
      const effectiveScheduledAt = getEffectiveScheduledTime(
        originalScheduledAt,
        data.recurrence || 'none',
        data.durationMinutes || 5
      );
      
      const durationMs = (data.durationMinutes || 0) * 60 * 1000;
      const endTime = effectiveScheduledAt.getTime() + durationMs;
      const nowTime = now.getTime();
      
      // Check if event is currently live (using effective scheduled time)
      if (nowTime >= effectiveScheduledAt.getTime() && nowTime < endTime) {
        return {
          id: docSnap.id,
          ...data,
          scheduledAt: effectiveScheduledAt, // Use effective time for live event
          createdAt: data.createdAt,
        } as SamuhikaaEvent;
      }
    }
    return null;
  }, [liveSnapshot]);

  // If there's a live event, show the live screen
  if (liveEvent) {
    return <SamuhikaaLiveScreen event={liveEvent} />;
  }

  // Otherwise, show the list of upcoming events
  return (
    <main className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Sparkles className="h-10 w-10 text-primary" />
          <h1 className="text-4xl md:text-5xl font-headline font-bold tracking-tight text-primary">
            SAMUHIKAA
          </h1>
          <Sparkles className="h-10 w-10 text-primary" />
        </div>
        <p className="text-xl md:text-2xl text-muted-foreground mb-2">
          One Time. One Mantra. One Collective Vibration.
        </p>
        <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
          Join thousands in synchronized collective chanting. Opt-in to participate in upcoming Samuhikaa events.
        </p>
      </div>

      {/* Events List */}
      <SamuhikaaList />
    </main>
  );
}

