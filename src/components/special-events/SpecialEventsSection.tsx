'use client';

import React, { useMemo } from 'react';
import { useFirestore } from '@/lib/firebase/provider';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { Trophy, Sparkles, Calendar, Clock, Users, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { SafeImage } from '@/components/ui/safe-image';

interface SpecialEvent {
  id: string;
  title: string;
  type: 'contest' | 'samuhikaa';
  startsAt: Date;
  endsAt?: Date;
  imageUrl?: string;
  description?: string;
  href: string;
  participantCount?: number;
}

export function SpecialEventsSection() {
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

  // Get all upcoming events
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const events: SpecialEvent[] = [];

    // Process contests
    if (contestsSnapshot) {
      contestsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const startDate = data.startDate?.toDate?.() || data.startDate;
        const endDate = data.endDate?.toDate?.() || data.endDate;
        
        if (startDate && startDate instanceof Date) {
          const endTime = endDate?.getTime() || startDate.getTime() + (7 * 24 * 60 * 60 * 1000); // Default 7 days
          
          // Event hasn't ended yet
          if (endTime > now.getTime()) {
            events.push({
              id: doc.id,
              title: data.title || 'Contest',
              type: 'contest',
              startsAt: startDate,
              endsAt: endDate,
              imageUrl: data.imageUrl,
              description: data.description,
              href: '/contests',
              participantCount: data.participantCount,
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
          const durationMs = (data.durationMinutes || 5) * 60 * 1000;
          const endTime = scheduledAt.getTime() + durationMs;
          
          // Event hasn't ended yet
          if (endTime > now.getTime()) {
            events.push({
              id: doc.id,
              title: data.title || 'Samuhikaa Event',
              type: 'samuhikaa',
              startsAt: scheduledAt,
              endsAt: new Date(endTime),
              description: data.description,
              href: '/samuhikaa',
            });
          }
        }
      });
    }

    // Sort by start time (earliest first)
    return events.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  }, [contestsSnapshot, samuhikaaSnapshot]);

  if (upcomingEvents.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4 px-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Special Events</h2>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/contests">
            View All
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </div>

      <div className="space-y-3 px-4">
        {upcomingEvents.slice(0, 3).map((event) => {
          const isUpcoming = event.startsAt.getTime() > new Date().getTime();
          const isLive = !isUpcoming && event.endsAt && event.endsAt.getTime() > new Date().getTime();

          return (
            <Card key={event.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <Link href={event.href}>
                <div className="flex gap-3">
                  {/* Image or Icon */}
                  <div className="relative w-20 h-20 shrink-0 bg-secondary rounded-l-lg overflow-hidden">
                    {event.imageUrl ? (
                      <SafeImage
                        src={event.imageUrl}
                        alt={event.title}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {event.type === 'contest' ? (
                          <Trophy className="h-8 w-8 text-primary/50" />
                        ) : (
                          <Sparkles className="h-8 w-8 text-primary/50" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <CardContent className="flex-1 p-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={isLive ? 'default' : 'secondary'} className="text-xs">
                          {isLive ? 'Live' : isUpcoming ? 'Upcoming' : 'Active'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {event.type === 'contest' ? 'Contest' : 'Samuhikaa'}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-sm line-clamp-1 mb-1">
                        {event.title}
                      </h3>
                      {event.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                          {event.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(event.startsAt, 'MMM d, h:mm a')}
                        </div>
                        {event.participantCount !== undefined && (
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {event.participantCount}
                          </div>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </div>
              </Link>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

