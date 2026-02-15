/**
 * Utility functions for video aspect ratio detection and filtering
 */

export type VideoOrientation = 'vertical' | 'horizontal' | 'square';

export interface VideoDimensions {
  width: number;
  height: number;
  aspectRatio: number; // width / height
  orientation: VideoOrientation;
}

/**
 * Detect video dimensions and orientation from a video file
 * @param file - Video file to analyze
 * @returns Promise with video dimensions and orientation
 */
export async function detectVideoAspectRatio(file: File): Promise<VideoDimensions> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);

    video.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(url);
      
      const width = video.videoWidth;
      const height = video.videoHeight;
      
      if (width === 0 || height === 0) {
        reject(new Error('Invalid video dimensions'));
        return;
      }

      const aspectRatio = width / height;
      let orientation: VideoOrientation;

      // Vertical: height > width (typical reels: 9:16, aspect ratio < 1)
      // Horizontal: width > height (typical YouTube: 16:9, aspect ratio > 1)
      // Square: width === height (aspect ratio === 1)
      if (aspectRatio < 0.95) {
        orientation = 'vertical'; // Height is significantly greater than width
      } else if (aspectRatio > 1.05) {
        orientation = 'horizontal'; // Width is significantly greater than height
      } else {
        orientation = 'square'; // Approximately square
      }

      resolve({
        width,
        height,
        aspectRatio,
        orientation,
      });
    });

    video.addEventListener('error', (e) => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video metadata'));
    });

    video.src = url;
    video.load();
  });
}

/**
 * Detect video dimensions from a video URL
 * @param url - Video URL to analyze
 * @returns Promise with video dimensions and orientation
 */
export async function detectVideoAspectRatioFromUrl(url: string): Promise<VideoDimensions> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';

    video.addEventListener('loadedmetadata', () => {
      const width = video.videoWidth;
      const height = video.videoHeight;
      
      if (width === 0 || height === 0) {
        reject(new Error('Invalid video dimensions'));
        return;
      }

      const aspectRatio = width / height;
      let orientation: VideoOrientation;

      if (aspectRatio < 0.95) {
        orientation = 'vertical';
      } else if (aspectRatio > 1.05) {
        orientation = 'horizontal';
      } else {
        orientation = 'square';
      }

      resolve({
        width,
        height,
        aspectRatio,
        orientation,
      });
    });

    video.addEventListener('error', (e) => {
      reject(new Error('Failed to load video metadata'));
    });

    video.src = url;
    video.load();
  });
}

/**
 * Check if a video is suitable for reels (vertical orientation)
 * @param dimensions - Video dimensions
 * @returns true if video is vertical
 */
export function isReelVideo(dimensions: VideoDimensions): boolean {
  return dimensions.orientation === 'vertical';
}

/**
 * Check if a video is suitable for feed (horizontal orientation)
 * @param dimensions - Video dimensions
 * @returns true if video is horizontal
 */
export function isFeedVideo(dimensions: VideoDimensions): boolean {
  return dimensions.orientation === 'horizontal';
}





