'use client';

import React, { useMemo } from 'react';
import { useFirestore } from '@/lib/firebase/provider';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { Trophy, Sparkles, Target, ArrowRight, Clock, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { format } from 'date-fns';
import { getEffectiveScheduledTime } from '@/utils/samuhikaa-recurrence';
import Image from 'next/image';

interface QuickFeature {
  id: string;
  title: string;
  type: 'contest' | 'samuhikaa' | 'challenge';
  startsAt: Date;
  imageUrl?: string;
  href: string;
  status: 'upcoming' | 'live';
  timeUntilStart?: number; // minutes
}

export function SpecialFeaturesCarousel() {
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

  // Fetch active challenges (if you have a challenges collection)
  // For now, we'll skip this and add it later if needed

  // Combine all features
  const features = useMemo(() => {
    const now = new Date();
    const allFeatures: QuickFeature[] = [];

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
            const isLive = nowTime >= startDate.getTime() && nowTime < endTime;
            const timeUntilStart = Math.max(0, startDate.getTime() - nowTime);
            
            allFeatures.push({
              id: doc.id,
              title: data.title || 'Contest',
              type: 'contest',
              startsAt: startDate,
              imageUrl: data.imageUrl,
              href: '/contests',
              status: isLive ? 'live' : 'upcoming',
              timeUntilStart: timeUntilStart > 0 ? Math.floor(timeUntilStart / (1000 * 60)) : undefined,
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
            const isLive = nowTime >= effectiveScheduledAt.getTime() && nowTime < endTime;
            const timeUntilStart = Math.max(0, effectiveScheduledAt.getTime() - nowTime);
            
            allFeatures.push({
              id: doc.id,
              title: data.title || 'Samuhikaa Event',
              type: 'samuhikaa',
              startsAt: effectiveScheduledAt,
              href: '/samuhikaa',
              status: isLive ? 'live' : 'upcoming',
              timeUntilStart: timeUntilStart > 0 ? Math.floor(timeUntilStart / (1000 * 60)) : undefined,
            });
          }
        }
      });
    }

    // Sort by start time (earliest first)
    return allFeatures
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
      .slice(0, 5); // Limit to 5 most relevant
  }, [contestsSnapshot, samuhikaaSnapshot]);

  if (features.length === 0) {
    return null;
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'contest':
        return Trophy;
      case 'samuhikaa':
        return Sparkles;
      case 'challenge':
        return Target;
      default:
        return Sparkles;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'contest':
        return 'Contest';
      case 'samuhikaa':
        return 'Samuhikaa';
      case 'challenge':
        return 'Challenge';
      default:
        return 'Event';
    }
  };

  return (
    <div className="flex gap-2.5 overflow-x-auto pb-1.5 -mx-4 px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {features.map((feature) => {
          const Icon = getIcon(feature.type);
          const isLive = feature.status === 'live';
          
          return (
            <Link key={feature.id} href={feature.href} className="shrink-0">
              <Card className="w-[180px] h-[90px] overflow-hidden hover:shadow-md transition-all hover:scale-[1.02] border-primary/20 hover:border-primary/40 flex flex-row">
                {/* Image or Gradient Background - Left side */}
                <div className="relative w-[90px] h-full bg-gradient-to-br from-primary/20 to-primary/5 shrink-0">
                  {feature.imageUrl ? (
                    <Image
                      src={feature.imageUrl}
                      alt={feature.title}
                      fill
                      className="object-cover"
                      sizes="90px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Icon className="h-6 w-6 text-primary/50" />
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className="absolute top-1.5 left-1.5">
                    <Badge 
                      variant={isLive ? 'default' : 'secondary'} 
                      className="text-[9px] px-1 py-0 h-4 font-medium"
                    >
                      {isLive ? '🔴 Live' : '⏰'}
                    </Badge>
                  </div>
                </div>
                
                {/* Content - Right side */}
                <div className="flex-1 p-2 flex flex-col justify-between min-w-0">
                  <div>
                    {/* Type Badge */}
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 mb-1.5 inline-block">
                      {getTypeLabel(feature.type)}
                    </Badge>
                    
                    <h4 className="text-xs font-semibold line-clamp-2 leading-tight mb-1">
                      {feature.title}
                    </h4>
                  </div>
                  
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3 shrink-0" />
                    {isLive ? (
                      <span className="truncate">Live Now</span>
                    ) : feature.timeUntilStart !== undefined ? (
                      <span className="truncate">
                        {feature.timeUntilStart < 60 
                          ? `${feature.timeUntilStart}m` 
                          : `${Math.floor(feature.timeUntilStart / 60)}h`}
                      </span>
                    ) : (
                      <span className="truncate">{format(feature.startsAt, 'h:mm a')}</span>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
  );
}

