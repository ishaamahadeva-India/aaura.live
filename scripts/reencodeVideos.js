/**
 * Video Re-encoding Script for Web Streaming (Node.js version)
 * 
 * This script re-encodes video files to be web-friendly and optimized for streaming.
 * It uses FFmpeg to move the MOOV atom to the beginning for progressive download.
 * 
 * Prerequisites:
 * 1. FFmpeg installed (sudo apt-get install ffmpeg or brew install ffmpeg)
 * 2. fluent-ffmpeg package: npm install fluent-ffmpeg
 * 
 * Usage: node scripts/reencodeVideos.js input.mp4 [output.mp4]
 */

const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

// Check if fluent-ffmpeg is installed
try {
  require.resolve('fluent-ffmpeg');
} catch (e) {
  console.error('❌ ERROR: fluent-ffmpeg is not installed');
  console.error('\nInstall it with: npm install fluent-ffmpeg');
  process.exit(1);
}

// Get command line arguments
const args = process.argv.slice(2);
const inputFile = args[0];
const outputFile = args[1] || (() => {
  const basename = path.basename(inputFile, path.extname(inputFile));
  const dirname = path.dirname(inputFile);
  return path.join(dirname, `${basename}_web.mp4`);
})();

// Validate input
if (!inputFile) {
  console.error('❌ ERROR: No input file specified');
  console.error('\nUsage:');
  console.error('  node scripts/reencodeVideos.js input.mp4 [output.mp4]');
  process.exit(1);
}

if (!fs.existsSync(inputFile)) {
  console.error(`❌ ERROR: Input file not found: ${inputFile}`);
  process.exit(1);
}

// Get original file size
const originalStats = fs.statSync(inputFile);
const originalSizeMB = (originalStats.size / (1024 * 1024)).toFixed(2);

console.log('🎬 Video Re-encoding for Web Streaming\n');
console.log(`Input:  ${inputFile}`);
console.log(`Output: ${outputFile}`);
console.log(`Original size: ${originalSizeMB} MB\n`);

// Re-encode with web-optimized settings
console.log('⏳ Re-encoding video...\n');

const command = ffmpeg(inputFile)
  .videoCodec('libx264')
  .audioCodec('aac')
  .addOption('-preset', 'fast')
  .addOption('-crf', '23')
  .addOption('-b:a', '128k')
  .addOption('-movflags', '+faststart') // CRITICAL: Moves MOOV atom to beginning
  .addOption('-pix_fmt', 'yuv420p')
  .addOption('-profile:v', 'high')
  .addOption('-level', '4.0')
  .output(outputFile)
  .on('start', (cmdline) => {
    console.log('FFmpeg command:', cmdline);
  })
  .on('progress', (progress) => {
    if (progress.percent) {
      process.stdout.write(`\rProgress: ${Math.round(progress.percent)}%`);
    }
  })
  .on('end', () => {
    console.log('\n');
    
    // Get new file size
    if (fs.existsSync(outputFile)) {
      const newStats = fs.statSync(outputFile);
      const newSizeMB = (newStats.size / (1024 * 1024)).toFixed(2);
      
      console.log('✅ Re-encoding complete!\n');
      console.log(`Original size: ${originalSizeMB} MB`);
      console.log(`New size:      ${newSizeMB} MB\n`);
      console.log('📤 Ready to upload to Firebase\n');
      console.log('Next steps:');
      console.log('  1. Test the video in a browser');
      console.log('  2. Upload to Firebase using: node scripts/uploadVideos.js');
    } else {
      console.error('❌ ERROR: Output file was not created');
      process.exit(1);
    }
  })
  .on('error', (err) => {
    console.error('\n❌ ERROR: Re-encoding failed');
    console.error(err.message);
    
    if (err.message.includes('ffmpeg')) {
      console.error('\nMake sure FFmpeg is installed:');
      console.error('  Ubuntu/Debian: sudo apt-get install ffmpeg');
      console.error('  macOS: brew install ffmpeg');
      console.error('  Windows: Download from https://ffmpeg.org/download.html');
    }
    
    process.exit(1);
  });

// Run the encoding
command.run();


