/**
 * Utility functions for calculating next occurrences of recurring Samuhikaa events
 */

import { Timestamp } from 'firebase/firestore';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';

/**
 * Calculate the next occurrence of a recurring event
 * @param originalScheduledAt - The original scheduled time from the event
 * @param recurrence - The recurrence type (daily, weekly, monthly)
 * @param durationMinutes - Duration of the event in minutes
 * @returns The next occurrence date, or null if event hasn't ended yet or no recurrence
 */
export function calculateNextOccurrence(
  originalScheduledAt: Timestamp | Date,
  recurrence: RecurrenceType,
  durationMinutes: number
): Date | null {
  if (recurrence === 'none') {
    return null;
  }

  const now = new Date();
  
  // Convert to Date if it's a Timestamp
  const scheduledAt = originalScheduledAt instanceof Timestamp
    ? originalScheduledAt.toDate()
    : originalScheduledAt instanceof Date
    ? originalScheduledAt
    : new Date(originalScheduledAt);

  if (isNaN(scheduledAt.getTime())) {
    return null;
  }

  const durationMs = durationMinutes * 60 * 1000;
  const endTime = scheduledAt.getTime() + durationMs;
  const nowTime = now.getTime();

  // If event hasn't ended yet, return null (use original scheduled time)
  if (nowTime < endTime) {
    return null;
  }

  // Calculate next occurrence based on recurrence type
  let nextOccurrence = new Date(scheduledAt);

  switch (recurrence) {
    case 'daily': {
      // Add days until we find the next occurrence
      // Start from tomorrow
      nextOccurrence.setDate(nextOccurrence.getDate() + 1);
      
      // Keep adding days until we're past the current time
      while (nextOccurrence.getTime() <= nowTime) {
        nextOccurrence.setDate(nextOccurrence.getDate() + 1);
      }
      break;
    }

    case 'weekly': {
      // Add 7 days (1 week)
      nextOccurrence.setDate(nextOccurrence.getDate() + 7);
      
      // Keep adding weeks until we're past the current time
      while (nextOccurrence.getTime() <= nowTime) {
        nextOccurrence.setDate(nextOccurrence.getDate() + 7);
      }
      break;
    }

    case 'monthly': {
      // Add 1 month
      nextOccurrence.setMonth(nextOccurrence.getMonth() + 1);
      
      // Keep adding months until we're past the current time
      while (nextOccurrence.getTime() <= nowTime) {
        nextOccurrence.setMonth(nextOccurrence.getMonth() + 1);
      }
      break;
    }

    default:
      return null;
  }

  return nextOccurrence;
}

/**
 * Get the effective scheduled time for an event (original or next occurrence)
 * @param event - The Samuhikaa event
 * @returns The effective scheduled time to display
 */
export function getEffectiveScheduledTime(
  originalScheduledAt: Timestamp | Date,
  recurrence: RecurrenceType,
  durationMinutes: number
): Date {
  const nextOccurrence = calculateNextOccurrence(originalScheduledAt, recurrence, durationMinutes);
  
  if (nextOccurrence) {
    return nextOccurrence;
  }

  // Return original scheduled time if event hasn't ended or no recurrence
  return originalScheduledAt instanceof Timestamp
    ? originalScheduledAt.toDate()
    : originalScheduledAt instanceof Date
    ? originalScheduledAt
    : new Date(originalScheduledAt);
}





