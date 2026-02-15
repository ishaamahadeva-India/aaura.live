
import { EventEmitter } from 'events';
import type { FirestorePermissionError } from './errors';

type ErrorEvents = {
  'permission-error': (error: FirestorePermissionError) => void;
};

// This is a client-side only event emitter.
// We are casting to a more specific event emitter type.
export const errorEmitter = new EventEmitter() as {
  on<E extends keyof ErrorEvents>(event: E, listener: ErrorEvents[E]): any;
  off<E extends keyof ErrorEvents>(event: E, listener: ErrorEvents[E]): any;
  emit<E extends keyof ErrorEvents>(event: E, ...args: Parameters<ErrorEvents[E]>): any;
};
