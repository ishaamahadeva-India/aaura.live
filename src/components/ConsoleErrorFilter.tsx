'use client';

import { useEffect } from 'react';

/**
 * Component to filter out harmless console errors
 * Suppresses Google Cast cancellation errors and duplicate registration warnings
 * Must be initialized early to catch third-party script warnings
 */
export function ConsoleErrorFilter() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const originalError = console.error;
    const originalWarn = console.warn;
    const originalLog = console.log;

    // Filter console.error
    console.error = function (...args: any[]) {
      // 🛑 Ignore empty objects or meaningless logs
      if (
        args.length === 2 &&
        typeof args[0] === "string" &&
        args[0].includes("Upload error") &&
        args[1] &&
        typeof args[1] === "object" &&
        Object.keys(args[1]).length === 0
      ) {
        return; // swallow it completely
      }
      
      const message = args.join(' ').toLowerCase();
      
      // Suppress cast cancellation errors
      if (message.includes('failed to cast') && message.includes('cancel')) {
        return; // Silently ignore cancellation errors
      }
      
      // Suppress cast framework duplicate registration warnings
      if (message.includes('google-cast-button') && message.includes('already been used')) {
        return; // Silently ignore duplicate registration
      }
      
      // Suppress RECEIVER_APP_ID undefined errors (non-critical)
      if (message.includes('receiver_app_id') && message.includes('undefined')) {
        return; // Silently ignore - we have fallback values
      }
      
      // ✅ Extract a real error if present
      const errorLike = args.find(
        (a) =>
          a instanceof Error ||
          (a && typeof a === "object" && ("code" in a || "message" in a))
      );
      
      // 🔥 Handle Firebase Storage errors cleanly
      if (errorLike?.code?.startsWith?.("storage/")) {
        // storage/unknown during 412 is NORMAL - just log once, don't rethrow
        if (errorLike.code === "storage/unknown") {
          console.warn("Storage finalize failed (likely duplicate upload or resumable session conflict)");
          return;
        }
        originalError.call(console, {
          code: errorLike.code,
          message: errorLike.message,
          serverResponse: errorLike.serverResponse,
        });
        return;
      }
      
      // ✅ Safe fallback
      try {
        originalError.apply(console, args);
      } catch {
        originalError.call(console, "Console error intercepted safely");
      }
    };

    // Filter console.warn
    console.warn = function (...args: any[]) {
      const message = args.join(' ').toLowerCase();
      
      // Suppress web-share feature warnings (harmless browser warning)
      if (message.includes('unrecognized feature') && message.includes('web-share')) {
        return; // Silently ignore - feature works despite warning
      }
      
      // Suppress cast framework duplicate registration warnings
      if (message.includes('google-cast-button') && message.includes('already been used')) {
        return; // Silently ignore duplicate registration
      }
      
      // Call original console.warn for other warnings
      originalWarn.apply(console, args);
    };

    // Filter console.log for web-share warnings that might come from third-party scripts
    console.log = function (...args: any[]) {
      const message = args.join(' ').toLowerCase();
      
      // Suppress web-share feature warnings from any source
      if (message.includes('unrecognized feature') && message.includes('web-share')) {
        return; // Silently ignore
      }
      
      // Call original console.log for other messages
      originalLog.apply(console, args);
    };

    return () => {
      // Restore original functions on unmount (though this component should never unmount)
      console.error = originalError;
      console.warn = originalWarn;
      console.log = originalLog;
    };
  }, []);

  return null;
}

