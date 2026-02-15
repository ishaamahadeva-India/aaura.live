'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, Calendar } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { SamuhikaaConsentButton } from './SamuhikaaConsentButton';
import { useSamuhikaaEventStatus, type SamuhikaaEvent } from '@/hooks/use-samuhikaa-event-status';
import { useFirestore } from '@/lib/firebase/provider';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { getEffectiveScheduledTime } from '@/utils/samuhikaa-recurrence';

interface SamuhikaaCardProps {
  event: SamuhikaaEvent;
}

export function SamuhikaaCard({ event }: SamuhikaaCardProps) {
  // Get effective scheduled time (handles recurrence - shows next occurrence if current has passed)
  const effectiveScheduledAt = getEffectiveScheduledTime(
    event.scheduledAt,
    event.recurrence || 'none',
    event.durationMinutes || 5
  );

  // Create a modified event with effective scheduled time for status calculation
  const eventWithEffectiveTime: SamuhikaaEvent = {
    ...event,
    scheduledAt: effectiveScheduledAt,
  };

  const { status, timeRemaining, isLive } = useSamuhikaaEventStatus(eventWithEffectiveTime);
  const db = useFirestore();
  const [participantCount, setParticipantCount] = useState<number | null>(null);
  const [isLoadingCount, setIsLoadingCount] = useState(false);

  const scheduledAt = effectiveScheduledAt;

  // Fetch participant count if enabled
  useEffect(() => {
    if (!event.showParticipantCount || !db || !event.id) return;
    if (status === 'COMPLETED') return; // Don't fetch for completed events

    const fetchCount = async () => {
      setIsLoadingCount(true);
      try {
        const participantsRef = collection(db, `samuhikaa_events/${event.id}/participants`);
        const snapshot = await getCountFromServer(participantsRef);
        setParticipantCount(snapshot.data().count);
      } catch (error) {
        console.error('Error fetching participant count:', error);
        setParticipantCount(null);
      } finally {
        setIsLoadingCount(false);
      }
    };

    fetchCount();
    // Refresh count every 30 seconds if live or upcoming
    if (status !== 'COMPLETED') {
      const interval = setInterval(fetchCount, 30000);
      return () => clearInterval(interval);
    }
  }, [db, event.id, event.showParticipantCount, status]);

  const formatTimeRemaining = (ms: number | null) => {
    if (!ms) return null;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <Card className="w-full border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-xl md:text-2xl mb-2">{event.title}</CardTitle>
            {event.description && (
              <CardDescription className="text-sm md:text-base mt-2">
                {event.description}
              </CardDescription>
            )}
          </div>
          <Badge 
            variant={status === 'LIVE' ? 'default' : status === 'UPCOMING' ? 'secondary' : 'outline'}
            className={status === 'LIVE' ? 'bg-red-600 text-white animate-pulse' : ''}
          >
            {status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mantra Display */}
        <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
          <p className="text-2xl md:text-3xl font-bold text-center text-primary">
            {event.mantra}
          </p>
        </div>

        {/* Event Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{format(scheduledAt, 'MMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{format(scheduledAt, 'h:mm a')}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>Duration: {event.durationMinutes} minutes</span>
        </div>

        {/* Participant Count */}
        {event.showParticipantCount && participantCount !== null && (
          <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg">
            <Users className="w-5 h-5 text-primary" />
            <span className="font-semibold">
              {isLoadingCount ? 'Loading...' : `${participantCount} participants`}
            </span>
          </div>
        )}

        {/* Time Remaining / Status */}
        {timeRemaining !== null && (
          <div className="text-center p-3 bg-muted rounded-lg">
            {isLive ? (
              <p className="text-sm font-semibold text-primary">
                Event in progress • {formatTimeRemaining(timeRemaining)} remaining
              </p>
            ) : status === 'UPCOMING' ? (
              <p className="text-sm text-muted-foreground">
                Starts in {formatTimeRemaining(timeRemaining)}
              </p>
            ) : null}
          </div>
        )}

        {/* Consent Button - Only show for upcoming or live events */}
        {status !== 'COMPLETED' && (
          <SamuhikaaConsentButton event={event} />
        )}
      </CardContent>
    </Card>
  );
}


