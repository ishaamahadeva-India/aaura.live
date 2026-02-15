/**
 * Utility to re-enable CDN from browser console
 * 
 * Usage in browser console:
 * import { enableCdn } from '@/lib/firebase/cdn-urls';
 * enableCdn();
 * 
 * Or simply:
 * localStorage.removeItem('cdn_disabled');
 * location.reload();
 */

export { enableCdn, disableCdn } from './cdn-urls';







