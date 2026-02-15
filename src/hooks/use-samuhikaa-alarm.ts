'use client';

import { useEffect, useRef, useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import type { SamuhikaaEvent } from './use-samuhikaa-event-status';
import { getEffectiveScheduledTime } from '@/utils/samuhikaa-recurrence';

/**
 * Hook to play a bell sound 1 minute before a Samuhikaa event
 */
export function useSamuhikaaAlarm(events: SamuhikaaEvent[]) {
  const [hasPermission, setHasPermission] = useState(false);
  const triggeredEventsRef = useRef<Set<string>>(new Set());
  const audioContextRef = useRef<AudioContext | null>(null);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        setHasPermission(permission === 'granted');
      });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      setHasPermission(true);
    }
  }, []);

  // Create audio context for bell sound
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume audio context on first user interaction (required for autoplay policies)
      const resumeAudio = async () => {
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          try {
            await audioContextRef.current.resume();
            console.log('🔔 Audio context resumed - alarm ready');
          } catch (err) {
            console.warn('Could not resume audio context:', err);
          }
        }
      };

      // Try to resume on various user interactions
      const events = ['click', 'touchstart', 'keydown'];
      events.forEach(event => {
        window.addEventListener(event, resumeAudio, { once: true });
      });

      return () => {
        events.forEach(event => {
          window.removeEventListener(event, resumeAudio);
        });
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
      };
    }
  }, []);

  /**
   * Generate a bell-like sound using Web Audio API
   */
  const playBellSound = async () => {
    if (!audioContextRef.current) return;

    const audioContext = audioContextRef.current;
    
    // Resume audio context if suspended (required for autoplay policies)
    if (audioContext.state === 'suspended') {
      try {
        await audioContext.resume();
      } catch (err) {
        console.warn('Could not resume audio context:', err);
        return;
      }
    }

    // Bell-like frequency pattern (multiple tones) - creates a pleasant bell sound
    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 - a pleasant bell chord

    const playTone = (freq: number, startTime: number, duration: number, volume: number) => {
      try {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();

        osc.frequency.value = freq;
        osc.type = 'sine'; // Sine wave for smooth bell tone

        // Envelope: fade in quickly, then fade out slowly
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(volume, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

        osc.connect(gain);
        gain.connect(audioContext.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
      } catch (err) {
        console.warn('Error playing tone:', err);
      }
    };

    const now = audioContext.currentTime;
    
    // Play a chord of bell tones with slight delay for a richer sound
    frequencies.forEach((freq, index) => {
      playTone(freq, now + index * 0.08, 0.8, 0.2);
    });

    // Play a second set slightly delayed for a more bell-like effect
    setTimeout(() => {
      if (audioContext.state === 'running') {
        frequencies.forEach((freq, index) => {
          playTone(freq, audioContext.currentTime + index * 0.08, 0.6, 0.15);
        });
      }
    }, 200);

    // Show browser notification if permission granted
    if (hasPermission && 'Notification' in window) {
      try {
        new Notification('Samuhikaa Event Starting Soon 🔔', {
          body: 'A Samuhikaa event will begin in 1 minute. 🙏',
          icon: '/favicon.ico',
          tag: 'samuhikaa-alarm',
          requireInteraction: false,
        });
      } catch (err) {
        console.warn('Could not show notification:', err);
      }
    }
  };

  // Monitor events and trigger alarm 1 minute before
  useEffect(() => {
    if (events.length === 0) return;

    const checkInterval = setInterval(() => {
      const now = new Date();
      const oneMinuteFromNow = new Date(now.getTime() + 60 * 1000); // 1 minute = 60,000 ms

      events.forEach(event => {
        if (!event.scheduledAt) return;

        // Get effective scheduled time (handles recurrence - shows next occurrence)
        const effectiveScheduledAt = getEffectiveScheduledTime(
          event.scheduledAt,
          event.recurrence || 'none',
          event.durationMinutes || 5
        );

        if (isNaN(effectiveScheduledAt.getTime())) return;

        // Create a unique key for this occurrence (event ID + date)
        // This allows the alarm to trigger for each occurrence of recurring events
        const occurrenceKey = `${event.id}-${effectiveScheduledAt.toISOString().split('T')[0]}`;

        // Skip if already triggered for this specific occurrence
        if (triggeredEventsRef.current.has(occurrenceKey)) {
          return;
        }

        // Check if event is exactly 1 minute away (within 5 second window)
        const timeUntilEvent = effectiveScheduledAt.getTime() - now.getTime();
        const oneMinuteInMs = 60 * 1000;
        const tolerance = 5 * 1000; // 5 second tolerance

        if (
          timeUntilEvent > 0 &&
          timeUntilEvent <= oneMinuteInMs + tolerance &&
          timeUntilEvent >= oneMinuteInMs - tolerance
        ) {
          console.log('🔔 Playing alarm for event:', event.title, 'scheduled at', effectiveScheduledAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
          playBellSound();
          triggeredEventsRef.current.add(occurrenceKey);
        }
      });
    }, 5000); // Check every 5 seconds

    return () => {
      clearInterval(checkInterval);
    };
  }, [events, hasPermission]);

  // Clean up old occurrence keys (older than 24 hours) to prevent memory buildup
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const oneDayAgo = now - (24 * 60 * 60 * 1000);
      
      triggeredEventsRef.current.forEach(key => {
        // Extract date from key if possible and clean up old entries
        // For simplicity, we'll just limit the size
        if (triggeredEventsRef.current.size > 100) {
          // Keep only the most recent 50 entries
          const entries = Array.from(triggeredEventsRef.current);
          triggeredEventsRef.current.clear();
          entries.slice(-50).forEach(k => triggeredEventsRef.current.add(k));
        }
      });
    }, 60 * 60 * 1000); // Clean up every hour

    return () => clearInterval(cleanupInterval);
  }, []);
}

