'use client';

import React, { useMemo, useState } from 'react';
import { useFirestore } from '@/lib/firebase/provider';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { X, Trophy, Users, Clock, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface UrgentEvent {
  id: string;
  title: string;
  type: 'contest' | 'samuhikaa';
  startsAt: Date;
  href: string;
}

export function UrgentEventsBanner() {
  const db = useFirestore();
  const [dismissedEvents, setDismissedEvents] = useState<Set<string>>(new Set());

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

  // Get urgent events (starting within 24 hours)
  const urgentEvents = useMemo(() => {
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const events: UrgentEvent[] = [];

    // Process contests
    if (contestsSnapshot) {
      contestsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const startDate = data.startDate?.toDate?.() || data.startDate;
        const endDate = data.endDate?.toDate?.() || data.endDate;
        
        if (startDate && startDate instanceof Date) {
          const startTime = startDate.getTime();
          const nowTime = now.getTime();
          const futureTime = twentyFourHoursFromNow.getTime();
          
          // Event starts within 24 hours and hasn't ended
          if (startTime > nowTime && startTime <= futureTime && (!endDate || endDate.getTime() > nowTime)) {
            events.push({
              id: doc.id,
              title: data.title || 'Contest',
              type: 'contest',
              startsAt: startDate,
              href: '/contests',
            });
          }
        }
      });
    }

    // Process Samuhikaa events
    if (samuhikaaSnapshot) {
      samuhikaaSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const scheduledAt = data.scheduledAt instanceof Timestamp
          ? data.scheduledAt.toDate()
          : data.scheduledAt instanceof Date
          ? data.scheduledAt
          : new Date(data.scheduledAt);
        
        if (scheduledAt && !isNaN(scheduledAt.getTime())) {
          const startTime = scheduledAt.getTime();
          const nowTime = now.getTime();
          const futureTime = twentyFourHoursFromNow.getTime();
          const durationMs = (data.durationMinutes || 5) * 60 * 1000;
          const endTime = startTime + durationMs;
          
          // Event starts within 24 hours and hasn't ended
          if (startTime > nowTime && startTime <= futureTime && endTime > nowTime) {
            events.push({
              id: doc.id,
              title: data.title || 'Samuhikaa Event',
              type: 'samuhikaa',
              startsAt: scheduledAt,
              href: '/samuhikaa',
            });
          }
        }
      });
    }

    // Sort by start time (earliest first)
    return events.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  }, [contestsSnapshot, samuhikaaSnapshot]);

  // Filter out dismissed events
  const visibleEvents = urgentEvents.filter(event => !dismissedEvents.has(event.id));

  if (visibleEvents.length === 0) {
    return null;
  }

  const nextEvent = visibleEvents[0];
  const timeUntilStart = nextEvent.startsAt.getTime() - new Date().getTime();
  const hoursUntilStart = Math.floor(timeUntilStart / (1000 * 60 * 60));
  const minutesUntilStart = Math.floor((timeUntilStart % (1000 * 60 * 60)) / (1000 * 60));

  const handleDismiss = (eventId: string) => {
    setDismissedEvents(prev => new Set([...prev, eventId]));
  };

  return (
    <Card className={cn(
      "mx-4 mb-4 border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5",
      "shadow-lg"
    )}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {nextEvent.type === 'contest' ? (
                <Trophy className="h-5 w-5 text-primary shrink-0" />
              ) : (
                <Sparkles className="h-5 w-5 text-primary shrink-0" />
              )}
              <Badge variant="default" className="text-xs">
                {nextEvent.type === 'contest' ? 'Contest' : 'Samuhikaa'}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {hoursUntilStart > 0 
                  ? `${hoursUntilStart}h ${minutesUntilStart}m`
                  : `${minutesUntilStart}m`
                }
              </Badge>
            </div>
            <h3 className="font-semibold text-sm mb-1 line-clamp-1">
              {nextEvent.title}
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Starting {formatDistanceToNow(nextEvent.startsAt, { addSuffix: true })}
            </p>
            <Button asChild size="sm" className="w-full sm:w-auto">
              <Link href={nextEvent.href}>
                {nextEvent.type === 'contest' ? 'Join Contest' : 'Participate'}
              </Link>
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => handleDismiss(nextEvent.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

