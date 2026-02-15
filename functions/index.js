/**
 * Firebase Cloud Functions for video processing
 * 
 * 1. processVideoUpload: Re-encodes videos for web streaming (faststart)
 * 2. convertVideoToHLS: Converts MP4 videos to HLS format for adaptive streaming
 */

const admin = require("firebase-admin");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
const { tmpdir } = require("os");
const { join, basename, extname, dirname } = require("path");
const fs = require("fs").promises;
const {onObjectFinalized} = require("firebase-functions/v2/storage");
const { randomUUID } = require("crypto");

// Multi-bucket (production) setup: originals bucket triggers processing; processed bucket stores outputs only.
const ORIGINAL_UPLOAD_BUCKET = "aaura-original-uploads";
const PROCESSED_MEDIA_BUCKET = "aaura-processed-media";

// Initialize Firebase Admin
admin.initializeApp();

const storage = admin.storage();
const firestore = admin.firestore();

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// NOTE: We intentionally do NOT call setGlobalOptions() here because this codebase mixes
// Gen-1 and Gen-2 functions. Firebase deploy may try to apply Gen-2 options (like CPU)
// to Gen-1 functions, which fails with:
// "Cannot set CPU on the functions processVideoUpload because they are GCF gen 1"

/**
 * Processes video uploads to ensure they're web-streamable
 * Gen-2 (Cloud Run). We deploy to a different region to bypass us-central1 CPU quota.
 */
exports.processVideoUpload = onObjectFinalized(
  {
    bucket: ORIGINAL_UPLOAD_BUCKET,
    region: "asia-south1",
    timeoutSeconds: 540,
    memory: "2GiB",
    // IMPORTANT:
    // - This function is CPU-heavy (ffmpeg). Keep concurrency low so an instance doesn't run many encodes at once.
    // - Also disable retries: if Cloud Run is saturated and returns 429, we don't want an automatic retry storm.
    concurrency: 1,
    retry: false,
    // Must stay <= 20 in this region/project due to Cloud Run regional CPU/Mem quotas.
    maxInstances: 20,
  },
  async (event) => {
    const object = event.data;
    const filePath = object.name;
    const contentType = object.contentType || "";
    const bucketName = object.bucket;

    // Hard safety check (should already be enforced by trigger bucket)
    if (bucketName && bucketName !== ORIGINAL_UPLOAD_BUCKET) return null;

    // Idempotency guard: if we already processed this object, never process again.
    // This is CRITICAL if the same object is ever re-uploaded with processed metadata.
    if (object.metadata?.processed === "true" || object.metadata?.processedBy === "processVideoUpload") {
      return null;
    }

    // Optional convention: if you ever move outputs into a /processed/ folder, skip them.
    if (filePath && filePath.includes("/processed/")) {
      return null;
    }

  // Only process video files
  if (!contentType.startsWith("video/")) {
    return null;
  }

    // CRITICAL: This function must ONLY process original MP4 uploads.
    // HLS segment files are often `video/mp2t` and would cause an invocation storm.
    if (!filePath || !filePath.endsWith(".mp4")) {
      return null;
    }

    // Only process videos in posts/ or media/ directories (your upload paths)
    if (!filePath.startsWith("posts/") && !filePath.startsWith("media/")) {
      return null;
    }

  // Skip if already processed or HLS files
  if (filePath.includes("-processed.") || filePath.includes("/hls/") || filePath.endsWith(".m3u8") || filePath.endsWith(".ts")) {
    return null;
  }

  console.log("Processing original video upload:", filePath);

  const sourceBucket = storage.bucket(ORIGINAL_UPLOAD_BUCKET);
  const outputBucket = storage.bucket(PROCESSED_MEDIA_BUCKET);

  const fileName = basename(filePath);
  const fileExt = extname(filePath);
  const tempFilePath = join(tmpdir(), `original-${Date.now()}-${fileName}`);
  const tempOutputPath = join(tmpdir(), `processed-${Date.now()}-${fileName}`);

  try {
    // Download original video to temp directory
    console.log("Downloading video to temp:", tempFilePath);
    await sourceBucket.file(filePath).download({ destination: tempFilePath });
    const fileStats = await fs.stat(tempFilePath);
    console.log(`Downloaded video: ${(fileStats.size / (1024 * 1024)).toFixed(2)} MB`);

    // Re-encode with faststart (critical for web streaming)
    // IMPORTANT: force a "clean" audio track (AAC-LC, stereo, 48kHz) to avoid crackling across devices.
    console.log("Re-encoding video with faststart...");
    await new Promise((resolve, reject) => {
      ffmpeg(tempFilePath)
        .videoCodec("libx264")
        .audioCodec("aac")
        .addOption("-preset", "fast")
        .addOption("-crf", "23")
        // Audio normalization: AAC-LC, 48kHz, stereo, resample async to fix timestamp drift/pops
        .addOption("-b:a", "128k")
        .addOption("-ac", "2")
        .addOption("-ar", "48000")
        .addOption("-profile:a", "aac_low")
        .addOption("-af", "aresample=async=1:min_hard_comp=0.100000:first_pts=0")
        .addOption("-movflags", "+faststart")
        .addOption("-pix_fmt", "yuv420p")
        .addOption("-profile:v", "high")
        .addOption("-level", "4.0")
        .output(tempOutputPath)
        .on("start", (commandLine) => {
          console.log("FFmpeg command:", commandLine);
        })
        .on("progress", (progress) => {
          if (progress.percent) {
            console.log(`Re-encoding progress: ${Math.round(progress.percent)}%`);
          }
        })
        .on("end", () => {
          console.log("Video re-encoded successfully");
          resolve();
        })
        .on("error", (err) => {
          console.error("FFmpeg error:", err);
          reject(err);
        })
        .run();
    });

    const outputStats = await fs.stat(tempOutputPath);
    console.log(`Processed video size: ${(outputStats.size / (1024 * 1024)).toFixed(2)} MB`);

    // Determine userId/videoId from original path: posts/{userId}/{videoId}.mp4
    const pathSegments = filePath.split("/");
    const userId = pathSegments.length >= 2 ? pathSegments[1] : "unknown";
    const videoId = basename(filePath, fileExt);

    // Upload processed video to the PROCESSED bucket (never triggers processVideoUpload).
    const processedMp4Path = `media/${userId}/${videoId}/mp4/${videoId}.mp4`;
    console.log("Uploading processed MP4 to processed bucket:", processedMp4Path);
    await outputBucket.upload(tempOutputPath, {
      destination: processedMp4Path,
      metadata: {
        contentType: contentType || "video/mp4",
        // Keep cache short to reduce the chance of stale bytes being served after overwrite.
        cacheControl: "public, max-age=60",
        metadata: {
          originalUpload: filePath,
          processedAt: new Date().toISOString(),
          processedBy: "processVideoUpload",
          processed: "true",
          // Force a new download token so old cached download URLs don't keep serving stale bytes.
          firebaseStorageDownloadTokens: randomUUID(),
        },
      },
    });

    console.log("Processed MP4 uploaded successfully");

    // Create a fresh signed URL for the processed object.
    // Many parts of the app use Firestore's videoUrl/mediaUrl directly, so we must update it.
    // Note: Maximum expiration is 7 days (604800000 ms) for signed URLs
    const [processedSignedUrl] = await outputBucket.file(processedMp4Path).getSignedUrl({
      action: "read",
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days (maximum allowed)
    });

    // Update Firestore documents
    if (pathSegments.length >= 3 && pathSegments[0] === "posts") {
      const postsQuery = await firestore
        .collection("posts")
        .where("videoStoragePath", "==", filePath)
        .limit(10)
        .get();

      if (!postsQuery.empty) {
        console.log(`Found ${postsQuery.size} post(s) to update`);
        const batch = firestore.batch();
        postsQuery.docs.forEach((doc) => {
          batch.update(doc.ref, {
            videoProcessed: true,
            videoProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
            // Original location (for audit/debug)
            videoStorageBucket: ORIGINAL_UPLOAD_BUCKET,
            videoStoragePath: filePath,
            // Processed output location (for playback)
            processedVideoBucket: PROCESSED_MEDIA_BUCKET,
            processedMp4StoragePath: processedMp4Path,
            videoUrl: processedSignedUrl, // playback
          });
        });
        await batch.commit();
        console.log("Firestore documents updated");
      }
    }

    // Also update media docs that store URLs directly.
    if (pathSegments.length >= 2 && pathSegments[0] === "media") {
      const mediaQuery = await firestore
        .collection("media")
        .where("mediaStoragePath", "==", filePath)
        .limit(10)
        .get();

      if (!mediaQuery.empty) {
        console.log(`Found ${mediaQuery.size} media doc(s) to update`);
        const batch = firestore.batch();
        mediaQuery.docs.forEach((doc) => {
          batch.update(doc.ref, {
            videoProcessed: true,
            videoProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
            mediaStorageBucket: ORIGINAL_UPLOAD_BUCKET,
            mediaStoragePath: filePath,
            processedVideoBucket: PROCESSED_MEDIA_BUCKET,
            processedMp4StoragePath: processedMp4Path,
            mediaUrl: processedSignedUrl,
          });
        });
        await batch.commit();
        console.log("Firestore media documents updated");
      }
    }

    // Cleanup temp files
    try {
      await fs.unlink(tempFilePath);
      await fs.unlink(tempOutputPath);
      console.log("Temp files cleaned up");
    } catch (cleanupError) {
      console.error("Error cleaning up temp files:", cleanupError);
    }

    console.log("Video processing completed successfully:", filePath);
    return null;
  } catch (error) {
    console.error("Error processing video:", error);
    try {
      await fs.unlink(tempFilePath).catch(() => {});
      await fs.unlink(tempOutputPath).catch(() => {});
    } catch (cleanupError) {
      console.error("Error cleaning up temp files after error:", cleanupError);
    }
    return null;
  }
    return null;
  }
);

/**
 * Converts MP4 videos to HLS format for adaptive streaming
 * Triggered when a video is uploaded to posts/ or media/ paths
 */
exports.convertVideoToHLS = onObjectFinalized(
  {
    bucket: PROCESSED_MEDIA_BUCKET,
    region: "asia-south1",
    timeoutSeconds: 540, // 9 minutes max (for long videos)
    memory: "2GiB", // 2GB memory for video processing
    maxInstances: 10,
    concurrency: 1,
    retry: false,
  },
  async (event) => {
  const object = event.data;
  const filePath = object.name;
  const contentType = object.contentType || "";
  const bucketName = object.bucket;

  // Hard safety check (should already be enforced by trigger bucket)
  if (bucketName && bucketName !== PROCESSED_MEDIA_BUCKET) return null;

  // Only process MP4 video files
  if (!contentType.startsWith("video/") || !filePath.endsWith(".mp4")) {
    console.log("Not an MP4 video file, skipping:", filePath);
    return null;
  }

  // Skip if already processed, HLS files, or in hls/ directory
  if (filePath.includes("/hls/") || filePath.endsWith(".m3u8") || filePath.endsWith(".ts") || filePath.includes("-processed.")) {
    console.log("Already processed or HLS file, skipping:", filePath);
    return null;
  }

  // Only process processed MP4s under media/{userId}/{videoId}/mp4/
  if (!filePath.startsWith("media/") || !filePath.includes("/mp4/")) {
    console.log("Not a processed media mp4, skipping:", filePath);
    return null;
  }

  console.log("Converting video to HLS:", filePath);

  const bucket = storage.bucket(PROCESSED_MEDIA_BUCKET);
  const fileName = basename(filePath, ".mp4");
  const fileDir = dirname(filePath);
  
  // Extract video ID from path (e.g., posts/{userId}/{videoId}-{filename}.mp4)
  // or media/{userId}/{videoId}/{filename}.mp4
  const pathParts = filePath.split("/");
  let videoId = fileName;
  if (pathParts.length >= 3) {
    // Try to extract video ID from filename (format: {videoId}-{timestamp}-{name}.mp4)
    const nameParts = fileName.split("-");
    if (nameParts.length > 1) {
      videoId = nameParts[0]; // Use first part as video ID
    } else {
      videoId = fileName.replace(".mp4", "");
    }
  }

  const tempFilePath = join(tmpdir(), `hls-input-${Date.now()}-${fileName}`);
  const hlsOutputDir = join(tmpdir(), `hls-output-${Date.now()}`);
  const masterM3u8Path = join(hlsOutputDir, "master.m3u8");

  try {
    // Create HLS output directory
    await fs.mkdir(hlsOutputDir, { recursive: true });

    // Download original video to temp directory
    console.log("Downloading video for HLS conversion:", tempFilePath);
    await bucket.file(filePath).download({ destination: tempFilePath });
    const fileStats = await fs.stat(tempFilePath);
    console.log(`Downloaded video: ${(fileStats.size / (1024 * 1024)).toFixed(2)} MB`);

    // Generate multiple bitrates for adaptive streaming
    // Bitrate levels: 240p, 480p, 720p, 1080p
    const bitrateLevels = [
      { name: "240p", width: 426, height: 240, bitrate: "400k", audioBitrate: "64k" },
      { name: "480p", width: 854, height: 480, bitrate: "1000k", audioBitrate: "96k" },
      { name: "720p", width: 1280, height: 720, bitrate: "2500k", audioBitrate: "128k" },
      { name: "1080p", width: 1920, height: 1080, bitrate: "5000k", audioBitrate: "192k" },
    ];

    console.log("Generating multiple bitrate HLS streams...");
    
    // First, get video dimensions to determine which bitrates to generate
    const videoInfo = await new Promise((resolve, reject) => {
      ffmpeg(tempFilePath).ffprobe((err, metadata) => {
        if (err) reject(err);
        else resolve(metadata);
      });
    });

    const originalWidth = videoInfo.streams.find(s => s.codec_type === 'video')?.width || 1920;
    const originalHeight = videoInfo.streams.find(s => s.codec_type === 'video')?.height || 1080;

    // Only generate bitrates that don't exceed original resolution
    const applicableBitrates = bitrateLevels.filter(level => level.height <= originalHeight);
    console.log(`Generating ${applicableBitrates.length} bitrate levels for ${originalWidth}x${originalHeight} video`);

    // Generate HLS for each bitrate
    const bitrateOutputs = [];
    for (const level of applicableBitrates) {
      const levelDir = join(hlsOutputDir, level.name);
      await fs.mkdir(levelDir, { recursive: true });
      const levelM3u8 = join(levelDir, "playlist.m3u8");

      await new Promise((resolve, reject) => {
        ffmpeg(tempFilePath)
          .videoCodec("libx264")
          .audioCodec("aac")
          .size(`${level.width}x${level.height}`)
          .videoBitrate(level.bitrate)
          .audioBitrate(level.audioBitrate)
          // Audio normalization for HLS too (prevents crackling across platforms)
          .addOption("-ac", "2")
          .addOption("-ar", "48000")
          .addOption("-profile:a", "aac_low")
          .addOption("-af", "aresample=async=1:min_hard_comp=0.100000:first_pts=0")
          .addOption("-hls_time", "4") // 4 second segments
          .addOption("-hls_list_size", "0") // Include all segments
          .addOption("-hls_segment_filename", join(levelDir, "segment%03d.ts"))
          .addOption("-start_number", "0")
          .addOption("-f", "hls")
          .addOption("-preset", "fast")
          .addOption("-crf", "23")
          .addOption("-pix_fmt", "yuv420p")
          .addOption("-profile:v", "high")
          .addOption("-level", "4.0")
          .addOption("-movflags", "+faststart") // Fast-start encoding
          .addOption("-sc_threshold", "0") // Disable scene change detection for consistent segments
          .addOption("-g", "48") // GOP size (2 seconds at 24fps)
          .addOption("-keyint_min", "48") // Minimum keyframe interval
          .output(levelM3u8)
          .on("start", (commandLine) => {
            console.log(`FFmpeg HLS command for ${level.name}:`, commandLine);
          })
          .on("progress", (progress) => {
            if (progress.percent) {
              console.log(`${level.name} conversion progress: ${Math.round(progress.percent)}%`);
            }
          })
          .on("end", () => {
            console.log(`${level.name} HLS conversion completed`);
            resolve();
          })
          .on("error", (err) => {
            console.error(`FFmpeg HLS error for ${level.name}:`, err);
            reject(err);
          })
          .run();
      });

      bitrateOutputs.push({ level, dir: levelDir, m3u8: levelM3u8 });
    }

    // Create master playlist (master.m3u8) with all bitrates
    console.log("Creating master playlist...");
    let masterPlaylist = "#EXTM3U\n#EXT-X-VERSION:3\n";
    
    for (const output of bitrateOutputs) {
      const level = output.level;
      // Read the individual playlist to get bandwidth info
      const playlistContent = await fs.readFile(output.m3u8, "utf8");
      const bandwidthMatch = playlistContent.match(/#EXT-X-STREAM-INF:BANDWIDTH=(\d+)/);
      const bandwidth = bandwidthMatch ? bandwidthMatch[1] : (parseInt(level.bitrate) * 1000);
      
      masterPlaylist += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${level.width}x${level.height}\n`;
      masterPlaylist += `${level.name}/playlist.m3u8\n`;
    }

    await fs.writeFile(masterM3u8Path, masterPlaylist);
    console.log("Master playlist created with", bitrateOutputs.length, "bitrate levels");

    // Upload HLS files to Storage
    // Put HLS next to mp4 folder, under media/{userId}/{videoId}/hls
    const hlsStoragePath = `${dirname(fileDir)}/hls`;
    console.log("Uploading HLS files to:", hlsStoragePath);

    // Upload master.m3u8
    const masterM3u8Content = await fs.readFile(masterM3u8Path);
    const masterM3u8StoragePath = `${hlsStoragePath}/master.m3u8`;
    await bucket.file(masterM3u8StoragePath).save(masterM3u8Content, {
      metadata: {
        contentType: "application/vnd.apple.mpegurl",
        cacheControl: "public, max-age=3600", // 1 hour for master playlist
      },
    });
    console.log("Uploaded master.m3u8");

    // Upload all bitrate playlists and segments
    let totalSegments = 0;
    for (const output of bitrateOutputs) {
      const level = output.level;
      const levelDir = output.dir;
      
      // Upload playlist.m3u8 for this bitrate
      const playlistContent = await fs.readFile(output.m3u8);
      const playlistStoragePath = `${hlsStoragePath}/${level.name}/playlist.m3u8`;
      await bucket.file(playlistStoragePath).save(playlistContent, {
        metadata: {
          contentType: "application/vnd.apple.mpegurl",
          cacheControl: "public, max-age=3600", // 1 hour for playlists
        },
      });
      console.log(`Uploaded ${level.name} playlist`);

      // Upload all .ts segment files for this bitrate
      const levelFiles = await fs.readdir(levelDir);
      const segmentFiles = levelFiles.filter(f => f.endsWith(".ts"));
      
      for (const segmentFile of segmentFiles) {
        const segmentPath = join(levelDir, segmentFile);
        const segmentContent = await fs.readFile(segmentPath);
        const segmentStoragePath = `${hlsStoragePath}/${level.name}/${segmentFile}`;
        await bucket.file(segmentStoragePath).save(segmentContent, {
          metadata: {
            contentType: "video/mp2t",
            cacheControl: "public, max-age=31536000", // 1 year cache for segments
          },
        });
      }
      totalSegments += segmentFiles.length;
      console.log(`Uploaded ${segmentFiles.length} segments for ${level.name}`);
    }
    console.log(`Uploaded total ${totalSegments} segment files across ${bitrateOutputs.length} bitrates`);

    // Get public URL for master.m3u8
    const [masterM3u8Url] = await bucket.file(masterM3u8StoragePath).getSignedUrl({
      action: "read",
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days (maximum allowed)
    });

    // Update Firestore with HLS URL.
    // We link by processedMp4StoragePath because that's the processed-bucket input file.
    const postsQuery = await firestore
      .collection("posts")
      .where("processedMp4StoragePath", "==", filePath)
      .limit(10)
      .get();

    if (!postsQuery.empty) {
      console.log(`Found ${postsQuery.size} post(s) to update with HLS URL`);
      const batch = firestore.batch();
      postsQuery.docs.forEach((doc) => {
        batch.update(doc.ref, {
          hlsUrl: masterM3u8Url,
          hlsProcessed: true,
          hlsProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
          processedVideoBucket: PROCESSED_MEDIA_BUCKET,
        });
      });
      await batch.commit();
      console.log("Firestore posts updated with HLS URL");
    }

    const mediaQuery = await firestore
      .collection("media")
      .where("processedMp4StoragePath", "==", filePath)
      .limit(10)
      .get();

    if (!mediaQuery.empty) {
      console.log(`Found ${mediaQuery.size} media doc(s) to update with HLS URL`);
      const batch = firestore.batch();
      mediaQuery.docs.forEach((doc) => {
        batch.update(doc.ref, {
          hlsUrl: masterM3u8Url,
          hlsProcessed: true,
          hlsProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
          processedVideoBucket: PROCESSED_MEDIA_BUCKET,
        });
      });
      await batch.commit();
      console.log("Firestore media updated with HLS URL");
    }

    // Cleanup temp files
    try {
      await fs.unlink(tempFilePath);
      // Remove all files in HLS output directory (recursive)
      await fs.rm(hlsOutputDir, { recursive: true, force: true }).catch(() => {});
      console.log("Temp files cleaned up");
    } catch (cleanupError) {
      console.error("Error cleaning up temp files:", cleanupError);
    }

    console.log("HLS conversion completed successfully:", filePath);
    return null;
  } catch (error) {
    console.error("Error converting video to HLS:", error);
    
    // Cleanup temp files on error
    try {
      await fs.unlink(tempFilePath).catch(() => {});
      await fs.rm(hlsOutputDir, { recursive: true, force: true }).catch(() => {});
    } catch (cleanupError) {
      console.error("Error cleaning up temp files after error:", cleanupError);
    }

    // Don't throw - original video is still available
    console.error("HLS conversion failed, but original file is still available");
    return null;
  }
  }
);
