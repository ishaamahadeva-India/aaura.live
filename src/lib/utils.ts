import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely checks if a string starts with a given prefix.
 * Returns false if the value is not a string or is null/undefined.
 * This prevents "can't access property 'startsWith', value is undefined" errors.
 */
export function safeStartsWith(value: unknown, prefix: string): boolean {
  if (value == null) return false;
  if (typeof value !== 'string') return false;
  try {
    return value.startsWith(prefix);
  } catch {
    return false;
  }
}
