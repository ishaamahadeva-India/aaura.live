/**
 * Storage error helpers (e.g. 412 Precondition Failed on resumable uploads).
 */

export function is412StorageError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string; serverResponse?: { status?: number } };
  if (e.serverResponse?.status === 412) return true;
  if (e.code === 'storage/unknown' && typeof e.message === 'string' && e.message.includes('412')) return true;
  return false;
}
