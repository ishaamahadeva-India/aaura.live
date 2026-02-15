'use client';

import React, { useMemo, useState } from 'react';
import { useFirestore } from '@/lib/firebase/provider';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { Trophy, Sparkles, Clock, Calendar, ArrowRight, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { getEffectiveScheduledTime } from '@/utils/samuhikaa-recurrence';
import Image from 'next/image';

interface MergedEvent {
  id: string;
  title: string;
  type: 'contest' | 'samuhikaa';
  startsAt: Date;
  endsAt?: Date;
  imageUrl?: string;
  description?: string;
  href: string;
  participantCount?: number;
  isUrgent: boolean; // Within 24 hours
}

export function MergedEventsSection() {
  const db = useFirestore();
  const [dismissedEvents, setDismissedEvents] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'urgent' | 'all'>('urgent');

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

  // Combine and process all events
  const allEvents = useMemo(() => {
    const now = new Date();
    const events: MergedEvent[] = [];

    // Process contests
    if (contestsSnapshot) {
      contestsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const startDate = data.startDate?.toDate?.() || data.startDate;
        const endDate = data.endDate?.toDate?.() || data.endDate;
        
        if (startDate && startDate instanceof Date) {
          const endTime = endDate?.getTime() || startDate.getTime() + (7 * 24 * 60 * 60 * 1000);
          const nowTime = now.getTime();
          
          if (endTime > nowTime) {
            const hoursUntilStart = (startDate.getTime() - nowTime) / (1000 * 60 * 60);
            events.push({
              id: doc.id,
              title: data.title || 'Contest',
              type: 'contest',
              startsAt: startDate,
              endsAt: endDate,
              imageUrl: data.imageUrl,
              description: data.description,
              href: '/contests',
              participantCount: data.participantCount || 0,
              isUrgent: hoursUntilStart <= 24 && hoursUntilStart > 0,
            });
          }
        }
      });
    }

    // Process Samuhikaa events
    if (samuhikaaSnapshot) {
      samuhikaaSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const originalScheduledAt = data.scheduledAt instanceof Timestamp
          ? data.scheduledAt.toDate()
          : data.scheduledAt instanceof Date
          ? data.scheduledAt
          : new Date(data.scheduledAt);
        
        if (originalScheduledAt && !isNaN(originalScheduledAt.getTime())) {
          const effectiveScheduledAt = getEffectiveScheduledTime(
            originalScheduledAt,
            data.recurrence || 'none',
            data.durationMinutes || 5
          );
          
          const durationMs = (data.durationMinutes || 5) * 60 * 1000;
          const endTime = effectiveScheduledAt.getTime() + durationMs;
          const nowTime = now.getTime();
          
          if (endTime > nowTime) {
            const hoursUntilStart = (effectiveScheduledAt.getTime() - nowTime) / (1000 * 60 * 60);
            events.push({
              id: doc.id,
              title: data.title || 'Samuhikaa Event',
              type: 'samuhikaa',
              startsAt: effectiveScheduledAt,
              endsAt: new Date(endTime),
              href: '/samuhikaa',
              description: data.description,
              isUrgent: hoursUntilStart <= 24 && hoursUntilStart > 0,
            });
          }
        }
      });
    }

    // Sort by start time
    return events.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  }, [contestsSnapshot, samuhikaaSnapshot]);

  const urgentEvents = useMemo(() => 
    allEvents.filter(e => e.isUrgent && !dismissedEvents.has(e.id)),
    [allEvents, dismissedEvents]
  );

  const visibleEvents = activeTab === 'urgent' ? urgentEvents : allEvents.slice(0, 3);

  if (allEvents.length === 0) {
    return null;
  }

  return (
    <Card className="md:hidden mb-4 shadow-sm border border-border bg-background">
      <CardContent className="p-3 bg-background">
        {/* Header Section - Compact and fully visible */}
        <div className="mb-3 pb-2 border-b border-primary/20">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
              <h3 className="text-sm font-bold text-foreground truncate" style={{ color: 'hsl(var(--foreground))' }}>
                Events & Contests
              </h3>
              {urgentEvents.length > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 font-bold shrink-0">
                  {urgentEvents.length}
                </Badge>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2 text-[10px] font-medium text-foreground hover:bg-primary/10 shrink-0" 
              asChild
            >
              <Link href="/contests">
                View All
                <ArrowRight className="h-3 w-3 ml-0.5" />
              </Link>
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'urgent' | 'all')}>
          <TabsList className="grid w-full grid-cols-2 mb-3 bg-muted">
            <TabsTrigger value="urgent" className="text-xs text-foreground data-[state=active]:text-foreground">
              Urgent {urgentEvents.length > 0 && `(${urgentEvents.length})`}
            </TabsTrigger>
            <TabsTrigger value="all" className="text-xs text-foreground data-[state=active]:text-foreground">
              All Events
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-2 mt-0">
            {visibleEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No {activeTab === 'urgent' ? 'urgent' : ''} events at the moment
              </p>
            ) : (
              visibleEvents.map((event) => (
                <Link key={event.id} href={event.href}>
                  <Card className="p-3 hover:shadow-md transition-all border-primary/20 hover:border-primary/40">
                    <div className="flex gap-3">
                      {event.imageUrl ? (
                        <div className="relative w-16 h-16 rounded-md overflow-hidden shrink-0">
                          <Image
                            src={event.imageUrl}
                            alt={event.title}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-md bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                          {event.type === 'contest' ? (
                            <Trophy className="h-6 w-6 text-primary/50" />
                          ) : (
                            <Sparkles className="h-6 w-6 text-primary/50" />
                          )}
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="text-sm font-semibold line-clamp-1 text-foreground">{event.title}</h4>
                          {event.isUrgent && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 shrink-0"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDismissedEvents(prev => new Set(prev).add(event.id));
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <Calendar className="h-3 w-3" />
                          <span>{format(event.startsAt, 'MMM d, h:mm a')}</span>
                        </div>
                        
                        {event.isUrgent && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                            {formatDistanceToNow(event.startsAt, { addSuffix: true })}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

