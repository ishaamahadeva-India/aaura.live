'use client';

import React from 'react';
import { useFirestore } from '@/lib/firebase/provider';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { SamuhikaaCard } from './SamuhikaaCard';
import { Loader2 } from 'lucide-react';
import type { SamuhikaaEvent } from '@/hooks/use-samuhikaa-event-status';
import { getEffectiveScheduledTime } from '@/utils/samuhikaa-recurrence';

export function SamuhikaaList() {
  const db = useFirestore();
  
  const eventsQuery = React.useMemo(() => {
    if (!db) return null;
    // Get ALL events first - we'll filter client-side
    // This ensures we see all events even if there are query/index issues
    try {
      // Try with isActive filter first
      return query(
        collection(db, 'samuhikaa_events'),
        where('isActive', '==', true)
      );
    } catch (err) {
      console.warn('Query with isActive filter failed, trying without filter:', err);
      // Fallback: get all events without any filters
      return collection(db, 'samuhikaa_events');
    }
  }, [db]);

  const [snapshot, loading, error] = useCollection(eventsQuery);

  // Debug logging
  React.useEffect(() => {
    console.log('SamuhikaaList - Query state:', {
      hasDb: !!db,
      hasQuery: !!eventsQuery,
      loading,
      error: error?.message,
      snapshotDocs: snapshot?.docs.length || 0,
    });
    
    if (snapshot) {
      console.log('=== SamuhikaaList - DEBUG INFO ===');
      console.log('Total docs fetched:', snapshot.docs.length);
      
      if (snapshot.docs.length === 0) {
        console.warn('⚠️ NO EVENTS FOUND IN DATABASE!');
        console.log('This could mean:');
        console.log('1. No events have been created yet');
        console.log('2. Events exist but isActive is false');
        console.log('3. Query is failing silently');
        console.log('4. Firestore rules are blocking access');
      }
      
      const now = new Date();
      snapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        const scheduledAt = data.scheduledAt instanceof Timestamp 
          ? data.scheduledAt.toDate() 
          : data.scheduledAt instanceof Date
          ? data.scheduledAt
          : new Date(data.scheduledAt);
        const durationMs = (data.durationMinutes || 5) * 60 * 1000;
        const endTime = scheduledAt.getTime() + durationMs;
        const nowTime = now.getTime();
        const isUpcoming = nowTime < scheduledAt.getTime();
        const isLive = nowTime >= scheduledAt.getTime() && nowTime < endTime;
        const isEnded = nowTime >= endTime;
        
        console.log(`Event #${index + 1}:`, {
          id: doc.id,
          title: data.title || 'NO TITLE',
          mantra: data.mantra || 'NO MANTRA',
          isActive: data.isActive,
          scheduledAtUTC: scheduledAt.toISOString(),
          scheduledAtIST: scheduledAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          nowUTC: now.toISOString(),
          nowIST: now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          endTimeUTC: new Date(endTime).toISOString(),
          endTimeIST: new Date(endTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          durationMinutes: data.durationMinutes || 5,
          timeUntilStart: isUpcoming ? `${Math.round((scheduledAt.getTime() - nowTime) / 1000 / 60)} minutes` : 'N/A',
          timeUntilEnd: !isEnded ? `${Math.round((endTime - nowTime) / 1000 / 60)} minutes` : 'N/A',
          status: isEnded ? '❌ ENDED' : isLive ? '🟢 LIVE' : isUpcoming ? '⏰ UPCOMING' : '❓ UNKNOWN',
          willShow: !isEnded && data.isActive !== false,
        });
      });
      console.log('=== END DEBUG INFO ===');
    }
    if (error) {
      console.error('❌ SamuhikaaList - Query error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
    }
  }, [snapshot, error, loading, db, eventsQuery]);

  const events: SamuhikaaEvent[] = React.useMemo(() => {
    if (!snapshot) return [];
    const now = new Date();
    
    // Filter to show only upcoming and live events (not completed)
    const allEvents = snapshot.docs
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
      });
    
    const filteredEvents = allEvents.filter(event => {
      // First check if event is active
      if (event.isActive === false) {
        console.log('Event filtered out (inactive):', event.id, event.title);
        return false;
      }
      
      if (!event.scheduledAt) {
        console.warn('Event missing scheduledAt:', event.id);
        return false;
      }
      
      // Get effective scheduled time (handles recurrence)
      const effectiveScheduledAt = getEffectiveScheduledTime(
        event.scheduledAt,
        event.recurrence || 'none',
        event.durationMinutes || 5
      );
      
      if (isNaN(effectiveScheduledAt.getTime())) {
        console.warn('Invalid scheduledAt for event:', event.id, event.scheduledAt);
        return false;
      }
      
      const durationMs = (event.durationMinutes || 5) * 60 * 1000;
      const endTime = effectiveScheduledAt.getTime() + durationMs;
      const nowTime = now.getTime();
      
      // Show if event hasn't ended yet (upcoming or live)
      // For recurring events, we always show them if they have a next occurrence
      const isUpcomingOrLive = nowTime < endTime || (event.recurrence && event.recurrence !== 'none');
      
      if (!isUpcomingOrLive) {
        console.log('Event filtered out (ended):', event.id, {
          title: event.title,
          scheduledAt: effectiveScheduledAt.toISOString(),
          scheduledAtIST: effectiveScheduledAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          endTime: new Date(endTime).toISOString(),
          endTimeIST: new Date(endTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          now: new Date(nowTime).toISOString(),
          nowIST: new Date(nowTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          recurrence: event.recurrence,
          timeUntilEnd: (endTime - nowTime) / 1000 / 60, // minutes
        });
      } else {
        console.log('✅ Event will be shown:', event.id, {
          title: event.title,
          scheduledAtIST: effectiveScheduledAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          nowIST: new Date(nowTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          recurrence: event.recurrence,
          timeUntilStart: (effectiveScheduledAt.getTime() - nowTime) / 1000 / 60, // minutes
        });
      }
      
      return isUpcomingOrLive;
    });
    
    console.log('SamuhikaaList - Filtered events:', filteredEvents.length, 'out of', allEvents.length);
    
    // Sort by effective scheduledAt ascending (earliest first)
    return filteredEvents.sort((a, b) => {
      const aEffective = getEffectiveScheduledTime(
        a.scheduledAt,
        a.recurrence || 'none',
        a.durationMinutes || 5
      );
      const bEffective = getEffectiveScheduledTime(
        b.scheduledAt,
        b.recurrence || 'none',
        b.durationMinutes || 5
      );
      return aEffective.getTime() - bEffective.getTime();
    });
  }, [snapshot]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    console.error('Error loading Samuhikaa events:', error);
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg font-semibold">Error loading Samuhikaa events</p>
        <p className="text-sm mt-2">{error.message}</p>
        <p className="text-xs mt-4 text-muted-foreground">
          {error.message?.includes('index') 
            ? 'Firestore index may be missing. Please check the console for details.'
            : 'Please refresh the page or contact support if the issue persists.'}
        </p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">No upcoming Samuhikaa events</p>
        <p className="text-sm mt-2">Check back soon for new collective chanting sessions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {events.map((event) => (
        <SamuhikaaCard key={event.id} event={event} />
      ))}
    </div>
  );
}

