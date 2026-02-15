'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useSamuhikaaEventStatus, type SamuhikaaEvent } from '@/hooks/use-samuhikaa-event-status';
import { useFirestore } from '@/lib/firebase/provider';
import { collection, getCountFromServer } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

interface SamuhikaaLiveScreenProps {
  event: SamuhikaaEvent;
}

export function SamuhikaaLiveScreen({ event }: SamuhikaaLiveScreenProps) {
  const { status, timeRemaining } = useSamuhikaaEventStatus(event);
  const db = useFirestore();
  const [participantCount, setParticipantCount] = useState<number | null>(null);
  const [isLoadingCount, setIsLoadingCount] = useState(false);

  // Update countdown every second
  const [, setTick] = useState(0);
  useEffect(() => {
    if (status !== 'LIVE') return;
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [status]);

  // Fetch participant count
  useEffect(() => {
    if (!event.showParticipantCount || !db || !event.id) return;

    const fetchCount = async () => {
      setIsLoadingCount(true);
      try {
        const participantsRef = collection(db, `samuhikaa_events/${event.id}/participants`);
        const snapshot = await getCountFromServer(participantsRef);
        setParticipantCount(snapshot.data().count);
      } catch (error) {
        console.error('Error fetching participant count:', error);
      } finally {
        setIsLoadingCount(false);
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [db, event.id, event.showParticipantCount]);

  const formatTimeRemaining = (ms: number | null) => {
    if (!ms) return '00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  if (status !== 'LIVE') {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-background p-4">
      <Card className="w-full max-w-2xl border-primary/30 bg-background/95 backdrop-blur-sm">
        <CardContent className="p-8 md:p-12 space-y-8">
          {/* Title */}
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">
              {event.title}
            </h1>
            {event.description && (
              <p className="text-muted-foreground text-sm md:text-base">
                {event.description}
              </p>
            )}
          </div>

          {/* Mantra - Large and Centered */}
          <div className="py-12 px-6 bg-primary/10 rounded-lg border-2 border-primary/20">
            <p className="text-4xl md:text-6xl lg:text-7xl font-bold text-center text-primary leading-relaxed">
              {event.mantra}
            </p>
          </div>

          {/* Countdown Timer */}
          {timeRemaining !== null && (
            <div className="text-center">
              <div className="inline-block px-6 py-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Time Remaining</p>
                <p className="text-3xl md:text-4xl font-bold text-primary">
                  {formatTimeRemaining(timeRemaining)}
                </p>
              </div>
            </div>
          )}

          {/* Participant Count */}
          {event.showParticipantCount && (
            <div className="text-center">
              <div className="inline-block px-6 py-3 bg-secondary/50 rounded-lg">
                {isLoadingCount ? (
                  <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground mb-1">Collective Participants</p>
                    <p className="text-2xl md:text-3xl font-bold text-primary">
                      {participantCount !== null ? participantCount : '—'}
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Guidance Text */}
          <div className="text-center pt-4">
            <p className="text-sm text-muted-foreground italic">
              Focus on the mantra. Chant with intention. Feel the collective vibration.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


