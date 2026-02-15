'use client';

import React, { useState, useEffect } from 'react';
import { SpecialFeaturesCarousel } from './SpecialFeaturesCarousel';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CollapsibleSpecialFeatures() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [hasAutoCollapsed, setHasAutoCollapsed] = useState(false);

  // Auto-collapse after 5 seconds on first load
  useEffect(() => {
    if (!hasAutoCollapsed) {
      const timer = setTimeout(() => {
        setIsExpanded(false);
        setHasAutoCollapsed(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [hasAutoCollapsed]);

  return (
    <div className="border-b border-border/50 bg-gradient-to-b from-background to-background/50">
      {/* Compact Header - Always visible */}
      <div className="px-4 py-1.5 flex items-center justify-between bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">✨ Special Features</span>
          {!isExpanded && (
            <span className="text-[10px] text-muted-foreground">(Tap to expand)</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Expandable Content */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out',
          isExpanded ? 'max-h-[150px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <SpecialFeaturesCarousel />
      </div>
    </div>
  );
}

