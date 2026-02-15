/**
 * Haptic feedback utility for mobile devices
 */

export function hapticFeedback(pattern: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light') {
  if (!('vibrate' in navigator)) {
    return;
  }

  const patterns = {
    light: 10,
    medium: 20,
    heavy: 30,
    success: [10, 50, 10],
    error: [20, 50, 20, 50, 20],
  };

  try {
    navigator.vibrate(patterns[pattern]);
  } catch (error) {
    // Silently fail if vibration is not supported
    console.debug('Haptic feedback not available');
  }
}





